import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type {
  Command,
  HandResult,
  Reply,
  RoomSnapshot,
  Session,
} from "../shared/types";
import { read, save } from "./storage";

export function useGame(name: string) {
  const [state, setState] = useState<RoomSnapshot>();
  const [error, setError] = useState("");
  const [connection, setConnection] = useState<
    "offline" | "connecting" | "online" | "reconnecting"
  >("offline");
  const worker = useRef<Worker | undefined>(undefined);
  const socket = useRef<Socket | undefined>(undefined);
  const session = useRef<Session | undefined>(undefined);
  const seenResult = useRef("");
  const update = useCallback((s: RoomSnapshot) => {
    setState(s);
    if (s.result && s.you >= 0 && s.players[s.you]?.inHand) {
      const key = `${s.roomCode}:${s.result.time}`;
      if (key !== seenResult.current) {
        seenResult.current = key;
        const records = read<(HandResult & { you: number })[]>("history", []);
        if (records.some(record => record.time === s.result!.time)) return;
        save("history", [{ ...s.result, you: s.you }, ...records].slice(0, 50));
      }
    }
  }, []);
  const startOffline = useCallback(() => {
    worker.current?.terminate();
    const w = new Worker(new URL("./game.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.current = w;
    w.onmessage = (e) => {
      if (e.data.type === "state") update(e.data.state);
      else setError(e.data.error);
    };
    w.onerror = () => setError("牌桌初始化失败，请重新加载");
    w.postMessage({ type: "init", name });
    const settings = read("settings", { difficulty: "standard", speed: 1 });
    w.postMessage({ type: "settings", ...settings });
    setConnection("offline");
  }, [name, update]);
  useEffect(() => {
    startOffline();
    return () => {
      worker.current?.terminate();
      socket.current?.disconnect();
    };
    // Profile updates are sent separately to preserve the current game.
  }, []);
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(""), 5000);
    return () => clearTimeout(t);
  }, [error]);
  const request = (s: Socket, type: string, data: unknown): Promise<Reply> =>
    new Promise((resolve) => {
      s.timeout(12000).emit(
        "request",
        { type, data },
        (err: Error | null, reply: Reply) =>
          resolve(
            err ? { ok: false, error: "连接超时，请检查服务器地址" } : reply,
          ),
      );
    });
  const connect = async (url: string, code?: string, resume = false) => {
    if (!/^https?:\/\//.test(url)) {
      setError("服务器地址需要以 http:// 或 https:// 开头");
      return false;
    }
    setConnection("connecting");
    socket.current?.disconnect();
    const s = io(url, {
      autoConnect: false,
      reconnectionAttempts: 12,
      timeout: 8000,
    });
    socket.current = s;
    let joined = false;
    s.on("state", update);
    s.on("session", (v: Session) => {
      session.current = v;
      save("session", { ...v, url });
    });
    s.on("disconnect", () => {
      if (joined) setConnection("reconnecting");
    });
    s.on("connect", async () => {
      if (joined && session.current) {
        const reply = await request(s, "resume", session.current);
        if (reply.ok) setConnection("online");
        else {
          setError(reply.error ?? "恢复失败");
          s.disconnect();
          setConnection("reconnecting");
        }
      }
    });
    s.on("room-closed", (message: string) => {
      setError(message);
      setConnection("reconnecting");
    });
    s.on("replaced", (message: string) => {
      setError(message);
      s.disconnect();
      setConnection("reconnecting");
    });
    const connected = await new Promise<boolean>((resolve) => {
      s.once("connect", () => resolve(true));
      s.once("connect_error", () => resolve(false));
      s.connect();
    });
    if (!connected) {
      s.disconnect();
      setConnection(state?.roomCode ? "reconnecting" : "offline");
      setError("无法连接服务器，请确认地址和服务状态");
      return false;
    }
    const saved = read<Session | null>("session", null);
    const reply = await request(
      s,
      resume && saved ? "resume" : code ? "join" : "create",
      resume && saved ? saved : { name, roomCode: code },
    );
    if (!reply.ok) {
      s.disconnect();
      setConnection(state?.roomCode ? "reconnecting" : "offline");
      setError(reply.error ?? "加入失败");
      return false;
    }
    joined = true;
    session.current = reply.session;
    save("session", { ...reply.session, url });
    save("server", url);
    worker.current?.terminate();
    worker.current = undefined;
    setConnection("online");
    return true;
  };
  const send = (command: Command) => {
    if (state?.roomCode) {
      if (connection !== "online" || !socket.current) {
        setError("连接恢复后才能操作");
        return;
      }
      void request(socket.current, "command", { command }).then((r) => {
        if (!r.ok) setError(r.error ?? "操作失败");
      });
    } else worker.current?.postMessage(command);
  };
  const leave = async () => {
    if (socket.current?.connected) await request(socket.current, "leave", {});
    socket.current?.disconnect();
    socket.current = undefined;
    session.current = undefined;
    save("session", null);
    startOffline();
  };
  return { state, error, setError, connection, connect, send, leave };
}
