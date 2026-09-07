import Fastify from "fastify";
import cors from "@fastify/cors";
import { Server } from "socket.io";
import { Worker } from "node:worker_threads";
import { randomInt, randomUUID } from "node:crypto";
import type { Reply } from "../shared/types";

const app = Fastify({ logger: true });
const configuredOrigins = process.env.CORS_ORIGINS?.split(",").map(s => s.trim()).filter(Boolean);
const origins = configuredOrigins?.length ? configuredOrigins : true;
await app.register(cors, { origin: origins });
const io = new Server(app.server, {
  cors: { origin: origins },
  maxHttpBufferSize: 16384,
});
const rooms = new Map<string, Worker>();
const membership = new Map<string, string>();
const pending = new Map<
  string,
  { resolve: (reply: Reply) => void; timeout: ReturnType<typeof setTimeout> }
>();
function request(
  worker: Worker,
  socket: string,
  type: string,
  data: unknown,
): Promise<Reply> {
  return new Promise((resolve) => {
    const id = randomUUID();
    const timeout = setTimeout(() => {
      pending.delete(id);
      resolve({ ok: false, error: "服务器响应超时" });
    }, 10000);
    pending.set(id, { resolve, timeout });
    worker.postMessage({ request: id, socket, type, data });
  });
}
function createRoom(name: string) {
  if (rooms.size >= 50) throw new Error("服务器房间已满");
  let code: string;
  do {
    code = String(randomInt(100000, 1000000));
  } while (rooms.has(code));
  const worker = new Worker(new URL("./room-worker.js", import.meta.url), {
    workerData: { name, code },
  });
  rooms.set(code, worker);
  worker.on("message", (m) => {
    if (m.type === "emit") io.to(m.socket).emit(m.event, m.data);
    if (m.type === "reply") {
      const p = pending.get(m.request);
      if (p) {
        clearTimeout(p.timeout);
        pending.delete(m.request);
        p.resolve(m.reply);
      }
    }
    if (m.type === "empty") {
      rooms.delete(code);
      void worker.terminate();
    }
    if (m.type === "fault")
      app.log.error({ room: code, error: m.error }, "Room error");
  });
  worker.on("error", (error) => {
    app.log.error({ room: code, error: error.message }, "Room worker failed");
    rooms.delete(code);
    for (const [id, room] of membership)
      if (room === code) {
        io.to(id).emit("room-closed", "牌桌服务已中断，请重新创建房间");
        membership.delete(id);
      }
  });
  return { code, worker };
}
io.on("connection", (socket) => {
  let windowStart = Date.now();
  let count = 0;
  let busy = false;
  socket.on("request", async (message, ack) => {
    if (typeof ack !== "function") return;
    if (Date.now() - windowStart > 10000) {
      windowStart = Date.now();
      count = 0;
    }
    if (++count > 40) return ack({ ok: false, error: "操作过于频繁" });
    if (busy) return ack({ ok: false, error: '上一操作尚未完成' });
    busy = true;
    try {
      if (!message || typeof message.type !== "string")
        throw new Error("无效请求");
      const data = message.data ?? {};
      if (["create", "join", "resume"].includes(message.type)) {
        if (membership.has(socket.id)) throw new Error("请先离开当前房间");
        const room =
          message.type === "create"
            ? createRoom(String(data.name ?? "玩家"))
            : {
                code: String(data.roomCode),
                worker: rooms.get(String(data.roomCode)),
              };
        if (!room.worker) throw new Error("房间不存在或已结束");
        const reply = await request(
          room.worker,
          socket.id,
          message.type === "resume" ? "resume" : "join",
          data,
        );
        if (reply.ok) {
          if (socket.connected) membership.set(socket.id, room.code);
          else void request(room.worker, socket.id, 'disconnect', {});
        }
        return ack(reply);
      }
      const code = membership.get(socket.id);
      const worker = code && rooms.get(code);
      if (!worker) throw new Error("房间已结束，请重新加入");
      if (!["command", "leave"].includes(message.type))
        throw new Error("无效请求");
      const reply = await request(worker, socket.id, message.type, data);
      if (message.type === "leave") membership.delete(socket.id);
      ack(reply);
    } catch (error) {
      ack({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      busy = false;
    }
  });
  socket.on("disconnect", () => {
    const code = membership.get(socket.id);
    const worker = code && rooms.get(code);
    if (worker) void request(worker, socket.id, "disconnect", {});
    membership.delete(socket.id);
  });
});
app.get("/health", () => ({
  status: "ok",
  rooms: rooms.size,
  connections: io.engine.clientsCount,
}));
await app.listen({ port: Number(process.env.PORT ?? 3001), host: "0.0.0.0" });
async function shutdown() {
  io.close();
  await Promise.all([...rooms.values()].map((w) => w.terminate()));
  await app.close();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
