import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawn, execFileSync, type ChildProcess } from "node:child_process";
import { io, type Socket } from "socket.io-client";
import type { Command, Reply, RoomSnapshot, Session } from "../shared/types";

const url = "http://127.0.0.1:3199";
let server: ChildProcess;
const clients: Socket[] = [];
const views = new Map<Socket, RoomSnapshot>();
async function until(predicate: () => boolean, timeout = 8000) {
  const end = Date.now() + timeout;
  while (!predicate()) {
    if (Date.now() > end) throw new Error("Timed out waiting for room state");
    await new Promise((r) => setTimeout(r, 25));
  }
}
async function client() {
  const socket = io(url, { autoConnect: false, reconnection: false });
  clients.push(socket);
  socket.on("state", (s) => views.set(socket, s));
  await new Promise<void>((resolve, reject) => {
    socket.once("connect", resolve);
    socket.once("connect_error", reject);
    socket.connect();
  });
  return socket;
}
const request = (socket: Socket, type: string, data: unknown): Promise<Reply> =>
  new Promise((resolve, reject) => {
    socket
      .timeout(12000)
      .emit("request", { type, data }, (error: Error | null, reply: Reply) =>
        error ? reject(error) : resolve(reply),
      );
  });
const command = (socket: Socket, command: Command) =>
  request(socket, "command", { command });

beforeAll(async () => {
  execFileSync("npm", ["run", "server:build"], { stdio: "pipe" });
  server = spawn(process.execPath, ["dist-server/index.js"], {
    env: { ...process.env, PORT: "3199" },
    stdio: "pipe",
  });
  for (let i = 0; i < 80; i++) {
    try {
      if ((await fetch(url + "/health")).ok) return;
    } catch {
      /* Wait for local server. */
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("Test server failed to start");
});
afterAll(async () => {
  clients.forEach((s) => s.disconnect());
  if (server && server.exitCode === null) {
    server.kill("SIGTERM");
    await new Promise((r) => server.once("exit", r));
  }
});
describe("multiplayer rooms", () => {
  it("runs a six-human hand, keeps hole cards private, rejects duplicates and resumes a seat", async () => {
    const host = await client();
    const created = await request(host, "create", { name: "Host" });
    expect(created.ok, created.error).toBe(true);
    const code = created.session!.roomCode;
    const members = [host];
    const sessions: Session[] = [created.session!];
    for (let i = 1; i < 6; i++) {
      const c = await client();
      const r = await request(c, "join", {
        roomCode: code,
        name: `Player${i}`,
      });
      expect(r.ok, r.error).toBe(true);
      members.push(c);
      sessions.push(r.session!);
      expect((await command(c, { type: "ready", ready: true })).ok).toBe(true);
    }
    const extra = await client();
    expect(
      (await request(extra, "join", { roomCode: code, name: "Extra" })).ok,
    ).toBe(false);
    expect((await command(members[1], { type: "start" })).ok).toBe(false);
    expect((await command(host, { type: "start" })).ok).toBe(true);
    await until(() => members.every((c) => views.get(c)?.stage === "preflop"));
    for (let seat = 0; seat < 6; seat++) {
      const view = views.get(members[seat])!;
      expect(view.you).toBe(seat);
      expect(view.players[seat].cards).toHaveLength(2);
      expect(
        view.players
          .filter((p) => p.seat !== seat)
          .every((p) => p.cards.length === 0),
      ).toBe(true);
    }
    const previousCards = views.get(members[2])!.players[2].cards;
    members[2].disconnect();
    const resumed = await client();
    expect((await request(resumed, "resume", sessions[2])).ok).toBe(true);
    members[2] = resumed;
    await until(() => !!views.get(resumed));
    expect(views.get(resumed)!.players[2].cards).toEqual(previousCards);
    let i = 0;
    while (views.get(host)!.stage !== "finished" && i++ < 50) {
      const current = views.get(host)!;
      const player = members[current.actor];
      await until(
        () => views.get(player)?.version === views.get(host)?.version,
      );
      const view = views.get(player)!;
      const action: Command = {
        type: "action",
        command: {
          id: `move${i}`,
          version: view.version,
          action: view.legal.includes("check") ? "check" : "call",
        },
      };
      expect((await command(player, action)).ok).toBe(true);
      expect((await command(player, action)).ok).toBe(true);
      await until(() => views.get(host)!.version > view.version);
    }
    expect(views.get(host)!.stage).toBe("finished");
    expect(views.get(host)!.players.reduce((n, p) => n + p.stack, 0)).toBe(
      12000,
    );
    expect(views.get(host)!.result!.net.reduce((n, p) => n + p, 0)).toBe(0);
    await request(host, "leave", {});
    await until(() => views.get(members[1])?.host === 1);
    expect(views.get(members[1])!.players[0].bot).toBe(true);
  });
  it("queues a mid-hand join with no hidden cards then seats the player at the boundary", async () => {
    const host = await client();
    const r = await request(host, "create", { name: "QueueHost" });
    await command(host, { type: "start" });
    const guest = await client();
    const joined = await request(guest, "join", {
      name: "Guest",
      roomCode: r.session!.roomCode,
    });
    expect(joined.ok).toBe(true);
    expect(joined.session!.seat).toBe(-1);
    await until(() => !!views.get(guest));
    expect(views.get(guest)!.players.every((p) => !p.cards.length)).toBe(true);
    await until(
      () =>
        views.get(host)!.actor === 0 || views.get(host)!.stage === "finished",
      20000,
    );
    const s = views.get(host)!;
    if (s.actor === 0)
      await command(host, {
        type: "action",
        command: { id: "fold-host", version: s.version, action: "fold" },
      });
    await until(() => views.get(guest)!.you >= 0, 45000);
    expect(views.get(guest)!.stage).toBe("finished");
    expect(views.get(guest)!.players[views.get(guest)!.you].name).toBe("Guest");
  });
});
