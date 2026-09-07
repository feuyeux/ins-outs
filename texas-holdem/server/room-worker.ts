import { parentPort, workerData } from "node:worker_threads";
import { randomBytes } from "node:crypto";
import { Game, cleanName } from "../shared/game";
import { decide } from "../shared/ai";
import type { Command, Reply } from "../shared/types";

const port = parentPort!;
const game = new Game(workerData.name);
game.roomCode = workerData.code;
const sessions = new Map<
  string,
  { seat: number; socket: string; disconnectedAt?: number }
>();
const waiting = new Map<
  string,
  { socket: string; name: string; token: string; disconnectedAt?: number }
>();
let turnTimer: ReturnType<typeof setTimeout> | undefined;
let scheduledTurn = "";
let idleSince = Date.now();
const token = () => randomBytes(24).toString("hex");
function emit(socket: string, event: string, data: unknown) {
  port.postMessage({ type: "emit", socket, event, data });
}
function broadcast() {
  for (const session of sessions.values())
    if (session.socket)
      emit(session.socket, "state", game.snapshot(session.seat));
  // Waiting players receive an anonymous view, never another player's cards.
  for (const entry of waiting.values())
    if (entry.socket) emit(entry.socket, "state", game.snapshot(-1));
}
function seatWaiting() {
  if (game.active) return;
  for (const [id, entry] of waiting) {
    if (!entry.socket) continue;
    const seat = game.players.findIndex((p) => p.bot);
    if (seat < 0) break;
    Object.assign(game.players[seat], {
      name: entry.name,
      bot: false,
      connected: true,
      ready: false,
      lastAction: "",
    });
    if (game.table.seats()[seat]) game.table.standUp(seat);
    game.table.sitDown(seat, 2000);
    game.holes[seat] = null;
    game.folded.delete(seat);
    sessions.set(entry.token, { seat, socket: entry.socket });
    waiting.delete(id);
    game.version++;
    if (game.host < 0) game.host = seat;
    emit(entry.socket, "session", {
      token: entry.token,
      roomCode: game.roomCode,
      seat,
    });
  }
}
function releaseSeat(sessionToken: string) {
  const s = sessions.get(sessionToken);
  if (!s) return;
  Object.assign(game.players[s.seat], {
    bot: true,
    name: ["Alex", "Oliver", "Sofia", "James", "Luna", "Leo"][s.seat],
    connected: true,
    ready: true,
  });
  sessions.delete(sessionToken);
  game.version++;
  if (game.host === s.seat)
    game.host = game.players.findIndex((p) => !p.bot && p.connected);
}
function cleanup() {
  for (const [key, entry] of waiting) {
    if (entry.disconnectedAt && Date.now() - entry.disconnectedAt >= 60000) waiting.delete(key);
  }
  if (!game.active) {
    for (const [key, s] of sessions)
      if (s.disconnectedAt && Date.now() - s.disconnectedAt >= 60000)
        releaseSeat(key);
    seatWaiting();
  }
  if (sessions.size || waiting.size) idleSince = Date.now();
  else if (Date.now() - idleSince > 60000) port.postMessage({ type: "empty" });
}
function schedule() {
  const turn = game.active ? `${game.hand}:${game.actor}:${game.deadline}` : "";
  if (scheduledTurn === turn) return;
  scheduledTurn = turn;
  clearTimeout(turnTimer);
  if (!game.active || game.actor < 0) return;
  const seat = game.actor;
  turnTimer = setTimeout(
    () => {
      scheduledTurn = "";
      try {
        const view = game.snapshot(seat);
        const a = game.players[seat].bot
          ? decide(view)
          : {
              action: view.legal.includes("check")
                ? ("check" as const)
                : ("fold" as const),
            };
        game.act(seat, a.action, "amount" in a ? a.amount : undefined);
        cleanup();
        broadcast();
        schedule();
      } catch (error) {
        port.postMessage({ type: "fault", error: String(error) });
      }
    },
    game.players[seat].bot
      ? 900 + Math.random() * 500
      : Math.max(0, game.deadline - Date.now()),
  );
}
port.on(
  "message",
  (message: {
    request: string;
    socket: string;
    type: string;
    data: Record<string, unknown>;
  }) => {
    const { request, socket, type, data } = message;
    let reply: Reply = { ok: true };
    try {
      if (type === "join") {
        if (sessions.size + waiting.size >= 6) throw new Error("房间已满");
        const sessionToken = token();
        if (!sessions.size && !game.active && !waiting.size) {
          sessions.set(sessionToken, { seat: 0, socket });
          Object.assign(game.players[0], {
            name: cleanName(data.name),
            bot: false,
            connected: true,
            ready: true,
          });
          game.host = 0;
          reply.session = {
            token: sessionToken,
            roomCode: game.roomCode,
            seat: 0,
          };
        } else {
          waiting.set(sessionToken, {
            socket,
            name: cleanName(data.name),
            token: sessionToken,
          });
          seatWaiting();
          reply.session = {
            token: sessionToken,
            roomCode: game.roomCode,
            seat: sessions.get(sessionToken)?.seat ?? -1,
          };
        }
        game.version++;
      } else if (type === "resume") {
        const queued = waiting.get(String(data.token));
        if (queued && (!queued.disconnectedAt || Date.now() - queued.disconnectedAt < 60000)) {
          if (queued.socket && queued.socket !== socket) emit(queued.socket, 'replaced', '会话已在另一设备恢复');
          queued.socket = socket; queued.disconnectedAt = undefined;
          reply.session = { token: queued.token, roomCode: game.roomCode, seat: -1 };
        } else {
        const s = sessions.get(String(data.token));
        if (!s || (s.disconnectedAt && Date.now() - s.disconnectedAt >= 60000))
          throw new Error("座位已过期，请重新加入");
        if (s.socket && s.socket !== socket)
          emit(s.socket, "replaced", "会话已在另一设备恢复");
        s.socket = socket;
        s.disconnectedAt = undefined;
        game.players[s.seat].connected = true;
        if (game.host < 0) game.host = s.seat;
        reply.session = {
          token: String(data.token),
          roomCode: game.roomCode,
          seat: s.seat,
        };
        game.version++;
        }
      } else {
        const found = [...sessions].find(([, s]) => s.socket === socket);
        if (!found) {
          const queued = [...waiting].find(([, entry]) => entry.socket === socket);
          if (type === 'leave' && queued) waiting.delete(queued[0]);
          else if (type === 'disconnect' && queued) { queued[1].socket = ''; queued[1].disconnectedAt = Date.now(); }
          else if (!['disconnect', 'leave'].includes(type)) throw new Error("请先加入房间");
        } else {
          const [key, s] = found;
          if (type === "disconnect" || type === "leave") {
            s.socket = "";
            s.disconnectedAt =
              type === "leave" ? Date.now() - 60000 : Date.now();
            game.players[s.seat].connected = false;
            if (game.host === s.seat)
              game.host = game.players.findIndex((p) => !p.bot && p.connected);
            if (!game.active && type === "leave") releaseSeat(key);
            game.version++;
          } else if (type === "command") {
            if (!data.command || typeof data.command !== "object")
              throw new Error("无效操作");
            const command = data.command as Command;
            if (
              !["start", "action", "ready", "rebuy", "profile"].includes(
                command.type,
              )
            )
              throw new Error("无效操作");
            game.execute(s.seat, command);
          }
        }
      }
      cleanup();
      broadcast();
      schedule();
    } catch (error) {
      reply = {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
    port.postMessage({ type: "reply", request, reply });
  },
);
setInterval(() => {
  const version = game.version;
  cleanup();
  if (game.version !== version) broadcast();
}, 1000);
