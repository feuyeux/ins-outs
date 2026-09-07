import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Copy,
  Flag,
  Globe2,
  History,
  LayoutGrid,
  LogOut,
  Maximize2,
  Minus,
  Plus,
  Settings2,
  ShieldCheck,
  Spade,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  Wifi,
  X,
} from "lucide-react";
import type {
  Action,
  Card,
  HandResult,
  PlayerView,
  RoomSnapshot,
} from "../shared/types";
import { useGame } from "./useGame";
import { read, save } from "./storage";

const suitSymbols = { clubs: "♣", diamonds: "♦", hearts: "♥", spades: "♠" };
const stageNames = {
  waiting: "等待开局",
  preflop: "翻牌前",
  flop: "翻牌",
  turn: "转牌",
  river: "河牌",
  finished: "本手结束",
};
const fmt = (n: number) => n.toLocaleString("en-US");
type Settings = {
  sound: boolean;
  volume: number;
  reduced: boolean;
  difficulty: "casual" | "standard";
  speed: number;
};

function PlayingCard({
  card,
  back = false,
  small = false,
  index = 0,
  winner = false,
}: {
  card?: Card;
  back?: boolean;
  small?: boolean;
  index?: number;
  winner?: boolean;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -15, rotateY: 70 }}
      animate={{ opacity: 1, y: 0, rotateY: 0 }}
      transition={{ duration: 0.28, delay: index * 0.075 }}
      className={`playing-card ${small ? "small" : ""} ${back ? "back" : ""} ${!card && !back ? "empty" : ""} ${card && ["hearts", "diamonds"].includes(card.suit) ? "red" : ""} ${winner ? "winning" : ""}`}
      aria-label={
        back
          ? "隐藏的手牌"
          : card
            ? `${card.rank}${suitSymbols[card.suit]}`
            : "待发公共牌"
      }
    >
      {back ? (
        <div className="back-emblem">
          <Spade size={small ? 13 : 23} fill="currentColor" />
        </div>
      ) : card ? (
        <>
          <span className="card-corner">
            {card.rank === "T" ? "10" : card.rank}
            <i>{suitSymbols[card.suit]}</i>
          </span>
          <span className="card-pip">{suitSymbols[card.suit]}</span>
          <span className="card-corner inverted">
            {card.rank === "T" ? "10" : card.rank}
            <i>{suitSymbols[card.suit]}</i>
          </span>
        </>
      ) : (
        <Spade size={21} />
      )}
    </motion.div>
  );
}
function Chips({
  amount,
  compact = false,
}: {
  amount: number;
  compact?: boolean;
}) {
  return (
    <span className={`chips ${compact ? "compact" : ""}`} aria-hidden="true">
      {Array.from(
        { length: Math.min(3, Math.max(1, Math.ceil(amount / 250))) },
        (_, i) => (
          <span className={`chip-stack stack-${i}`} key={i}>
            {[0, 1, 2].map((j) => (
              <i key={j} style={{ bottom: j * 4 }} />
            ))}
          </span>
        ),
      )}
    </span>
  );
}
function Seat({
  player,
  state,
  position,
  seconds,
}: {
  player: PlayerView;
  state: RoomSnapshot;
  position: number;
  seconds: number;
}) {
  const active = player.seat === state.actor;
  const own = player.seat === state.you;
  const winner = state.result?.winners.find((w) => w.seat === player.seat);
  const hasHand = state.stage !== "waiting" && player.inHand;
  return (
    <div
      className={`seat seat-${position} ${active ? "active" : ""} ${player.folded ? "folded" : ""} ${own ? "own" : ""} ${winner ? "winner" : ""}`}
    >
      {!own && hasHand && (
        <div className="opponent-cards">
          {[0, 1].map((i) => (
            <PlayingCard
              key={`${state.hand}-${i}`}
              card={player.cards[i]}
              back={!player.cards[i]}
              small
              index={i}
            />
          ))}
        </div>
      )}
      <div className="seat-identity">
        <div className="avatar-wrap">
          <img
            src={`./assets/avatar-${player.seat}.webp`}
            alt=""
            className="avatar"
          />
          {active && (
            <svg className="timer-ring" viewBox="0 0 64 64">
              <circle
                cx="32"
                cy="32"
                r="30"
                style={{
                  strokeDasharray: 189,
                  strokeDashoffset: 189 * (1 - seconds / 25),
                }}
              />
            </svg>
          )}
          {winner && (
            <span className="winner-crown">
              <Trophy size={12} />
            </span>
          )}
        </div>
        <div className="seat-info">
          <div className="player-name">
            {player.name}
            {own && <span className="you-label">你</span>}
            {!player.bot && !player.connected && (
              <span className="disconnected-dot" />
            )}
          </div>
          <div className="player-stack">
            {fmt(player.stack)}
            <span>筹码</span>
          </div>
        </div>
        {state.dealer === player.seat && state.hand > 0 && (
          <span className="dealer-button" title="庄家">
            D
          </span>
        )}
      </div>
      <div className={`player-action ${active ? "thinking" : ""}`}>
        {winner
          ? `+${fmt(winner.amount)}`
          : active
            ? `${own ? "轮到你了" : "思考中"} · ${seconds}s`
            : player.lastAction ||
              (player.bot ? "AI 玩家" : player.ready ? "已准备" : "未准备")}
      </div>
      {player.bet > 0 && (
        <motion.div
          key={player.bet}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="seat-bet"
        >
          <Chips amount={player.bet} compact />
          <span>{fmt(player.bet)}</span>
        </motion.div>
      )}
    </div>
  );
}

export default function App() {
  const [name, setName] = useState(() => read("name", "Alex"));
  const [settings, setSettings] = useState<Settings>(() =>
    read("settings", {
      sound: true,
      volume: 0.4,
      reduced: false,
      difficulty: "standard",
      speed: 1,
    }),
  );
  const game = useGame(name);
  const { state, connection } = game;
  const [panel, setPanel] = useState<
    "rooms" | "settings" | "history" | "help" | null
  >(null);
  const [roomTab, setRoomTab] = useState("create");
  const [server, setServer] = useState(() =>
    read("server", "http://localhost:3001"),
  );
  const [roomCode, setRoomCode] = useState("");
  const [raise, setRaise] = useState(40);
  const [clock, setClock] = useState(Date.now());
  const [pending, setPending] = useState(false);
  const [roomBusy, setRoomBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expandedHand, setExpandedHand] = useState<number | null>(null);
  useEffect(() => {
    if (!panel) return;
    const previous = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() => document.querySelector<HTMLElement>('.modal button')?.focus());
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPanel(null);
      if (event.key !== 'Tab') return;
      const elements = Array.from(document.querySelectorAll<HTMLElement>('.modal button:not(:disabled), .modal input:not(:disabled), .modal a[href]'));
      const first = elements[0], last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('keydown', handleKey); previous?.focus(); };
  }, [panel]);
  const audio = useRef<Record<string, HTMLAudioElement>>({});
  const last = useRef<
    | { hand: number; board: number; version: number; finished: boolean }
    | undefined
  >(undefined);
  useEffect(() => {
    const t = setInterval(() => setClock(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    setRaise(state?.range?.min ?? 40);
    setPending(false);
  }, [state?.version]);
  useEffect(() => {
    if (game.error) setPending(false);
  }, [game.error]);
  useEffect(() => {
    save("settings", settings);
    game.send({
      type: "settings",
      difficulty: settings.difficulty,
      speed: settings.speed,
    });
  }, [settings.difficulty, settings.speed]);
  useEffect(() => {
    save("settings", settings);
  }, [settings]);
  useEffect(() => {
    if (!state) return;
    const previous = last.current;
    const key =
      state.stage === "finished" && !previous?.finished
        ? "win"
        : state.hand !== previous?.hand ||
            state.board.length !== previous?.board
          ? "deal"
          : "chip";
    if (
      settings.sound &&
      state.hand > 0 &&
      state.version !== previous?.version
    ) {
      const sound = (audio.current[key] ??= new Audio(`./assets/${key}.wav`));
      sound.volume = settings.volume;
      sound.currentTime = 0;
      void sound.play().catch(() => {});
    }
    last.current = {
      hand: state.hand,
      board: state.board.length,
      version: state.version,
      finished: state.stage === "finished",
    };
  }, [state?.version]);
  const seconds = state
    ? Math.max(0, Math.min(25, Math.ceil((state.deadline - clock) / 1000)))
    : 25;
  const mine = state?.players[state.you];
  const myTurn = !!state && state.actor === state.you && state.you >= 0;
  const active = state && !["waiting", "finished"].includes(state.stage);
  const online = !!state?.roomCode;
  const controlsDisabled =
    !myTurn || pending || (online && connection !== "online");
  const act = (action: Action, amount?: number) => {
    if (!state || controlsDisabled) return;
    setPending(true);
    game.send({
      type: "action",
      command: {
        id: crypto.randomUUID(),
        version: state.version,
        action,
        amount,
      },
    });
    setTimeout(() => setPending(false), 1500);
  };
  const aggressive = state?.legal.includes("raise") ? "raise" : "bet";
  const records =
    panel === "history"
      ? read<(HandResult & { you: number })[]>("history", [])
      : [];
  const setNameValue = (value: string) => {
    setName(value);
    save("name", value);
    game.send({ type: "profile", name: value });
  };
  const joinRoom = async (resume = false) => {
    if (roomBusy) return;
    setRoomBusy(true);
    try {
      if (
        await game.connect(
          server,
          roomTab === "join" ? roomCode : undefined,
          resume,
        )
      )
        setPanel(null);
    } finally {
      setRoomBusy(false);
    }
  };
  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(state?.roomCode ?? "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      game.setError("无法复制，请手动选取房间码");
    }
  };
  return (
    <MotionConfig reducedMotion={settings.reduced ? "always" : "user"}>
      <div className={`app ${settings.reduced ? "reduce-motion" : ""}`}>
        <header className="topbar" inert={!!panel}>
          <a className="brand" href="#" aria-label="River Club">
            <span className="brand-mark">
              <Spade fill="currentColor" size={26} />
            </span>
            <span>
              RIVER<span className="brand-club">CLUB</span>
            </span>
          </a>
          <nav className="main-nav">
            <button
              className={!online ? "selected" : ""}
              onClick={() => {
                if (online) void game.leave();
              }}
            >
              <Spade size={15} />
              单人练习
            </button>
            <button
              className={online ? "selected" : ""}
              onClick={() => setPanel("rooms")}
            >
              <Users size={16} />
              好友牌局
            </button>
          </nav>
          <div className="header-right">
            <span className="play-money">
              <ShieldCheck size={14} />
              休闲竞技 · 虚拟筹码
            </span>
            <button
              className="profile-button"
              onClick={() => setPanel("settings")}
            >
              <img src="./assets/avatar-0.webp" alt="" />
              <span>{name}</span>
              <ChevronDown size={13} />
            </button>
          </div>
        </header>
        <main inert={!!panel}>
          <div className="table-toolbar">
            <div className="table-title">
              <span className="live-dot" />
              <h1>{online ? "好友牌桌" : "经典六人桌"}</h1>
              <span className="table-limit">无限注德州扑克</span>
              <span className="room-number">
                {online ? `# ${state?.roomCode}` : "NO. 001"}
              </span>
            </div>
            <div className="table-tools">
              <button
                className="icon-button"
                title="牌局记录"
                onClick={() => setPanel("history")}
                aria-label="牌局记录"
              >
                <History size={18} />
              </button>
              <button
                className="icon-button"
                title={settings.sound ? "静音" : "开启声音"}
                aria-label={settings.sound ? "静音" : "开启声音"}
                onClick={() => setSettings((s) => ({ ...s, sound: !s.sound }))}
              >
                {settings.sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>
              <button
                className="icon-button"
                title="设置"
                aria-label="设置"
                onClick={() => setPanel("settings")}
              >
                <Settings2 size={18} />
              </button>
              <button
                className="icon-button fullscreen"
                title="全屏"
                aria-label="全屏"
                onClick={() => {
                  if (document.fullscreenElement)
                    void document.exitFullscreen();
                  else void document.documentElement.requestFullscreen?.();
                }}
              >
                <Maximize2 size={16} />
              </button>
            </div>
          </div>
          {connection === "reconnecting" && (
            <div className="connection-banner">
              <Wifi size={15} />
              连接中断，正在恢复牌桌…
              <button onClick={() => void game.leave()}>返回练习</button>
            </div>
          )}
          <section className="game-stage" aria-label="德州扑克牌桌">
            <div className="stage-meta">
              <span>
                <span className="small-label">BLINDS</span>10 / 20
              </span>
              <span>
                <span className="small-label">BUY-IN</span>2,000
              </span>
            </div>
            <div className="table-shadow" />
            <div className="poker-table">
              <div className="table-rail">
                <div className="table-felt">
                  <div className="felt-stitch" />
                  <div className="felt-brand">
                    <Spade size={27} fill="currentColor" />
                    <span>RIVER CLUB</span>
                    <small>TEXAS HOLD'EM</small>
                  </div>
                </div>
              </div>
            </div>
            <div className="community-area">
              <div className="pot-label">
                {state?.stage === "finished" ? "本手底池" : "总底池"}
                <span> / TOTAL POT</span>
              </div>
              <motion.div
                key={state?.pot}
                initial={{ scale: 0.96 }}
                animate={{ scale: 1 }}
                className="pot-total"
              >
                <Chips amount={state?.pot ?? 0} />
                <span>{fmt(state?.pot ?? 0)}</span>
              </motion.div>
              <div className="community-cards">
                {Array.from({ length: 5 }, (_, i) => (
                  <PlayingCard
                    key={`${state?.hand}-${i}-${state?.board[i]?.rank ?? "empty"}`}
                    card={state?.board[i]}
                    index={state?.board[i] ? i : 0}
                    winner={
                      !!state?.result?.winners.some((w) =>
                        w.cards.some(
                          (c) =>
                            c.rank === state.board[i]?.rank &&
                            c.suit === state.board[i]?.suit,
                        ),
                      )
                    }
                  />
                ))}
              </div>
              <div className="street-label">
                <span />
                {state ? stageNames[state.stage] : "正在入座"}
                <span />
              </div>
              {state?.pots && state.pots.length > 1 && (
                <span className="side-pots">
                  {state.pots
                    .map((p, i) => `${i ? `边池 ${i}` : "主池"} ${fmt(p.size)}`)
                    .join(" · ")}
                </span>
              )}
            </div>
            {state?.players.map((player) => (
              <Seat
                key={player.seat}
                player={player}
                state={state}
                position={(player.seat - Math.max(0, state.you) + 6) % 6}
                seconds={seconds}
              />
            ))}
            <div className="your-hand">
              {mine?.cards.length ? (
                mine.cards.map((card, i) => (
                  <PlayingCard
                    key={`${state?.hand}-${i}`}
                    card={card}
                    index={i}
                    winner={
                      !!state?.result?.winners.some((w) => w.seat === state.you)
                    }
                  />
                ))
              ) : (
                <>
                  <PlayingCard back />
                  <PlayingCard back index={1} />
                </>
              )}
            </div>
            <div className="table-corner left">
              <ShieldCheck size={13} />
              {online ? "好友私人牌局" : "本地离线牌局"}
            </div>
            <div className="table-corner right">
              <span className="live-dot" />
              {online
                ? `${state?.players.filter((p) => !p.bot).length} 位好友`
                : "5 位 AI 对手"}
            </div>
          </section>
          <section className="action-dock" aria-label="下注操作">
            <div className="hand-summary">
              <span className="small-label">YOUR STACK</span>
              <div>
                <span className="tiny-chip" />
                {fmt(mine?.stack ?? 2000)}
              </div>
              <small>
                {mine?.folded
                  ? "本手已弃牌"
                  : myTurn
                    ? "轮到你行动"
                    : !active
                      ? "准备好下一手"
                      : `${state?.players[state.actor]?.name ?? "牌桌"} 正在行动`}
              </small>
            </div>
            {!active ? (
              <div className="between-hands">
                <div className="result-summary">
                  {state?.result ? (
                    <>
                      <Trophy size={19} />
                      <div>
                        <strong>
                          {state.result.winners.map((w) => w.name).join("、")}{" "}
                          赢得 {fmt(state.result.pot)}
                        </strong>
                        <span>
                          {state.result.winners
                            .map((w) => w.handName)
                            .filter((v, i, a) => a.indexOf(v) === i)
                            .join(" · ")}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <Spade size={21} />
                      <div>
                        <strong>好牌，值得等待。</strong>
                        <span>六人牌桌 · 10 / 20 盲注</span>
                      </div>
                    </>
                  )}
                </div>
                {mine && mine.stack < 2000 && (
                  <button
                    className="secondary-button rebuy"
                    onClick={() => game.send({ type: "rebuy" })}
                  >
                    <Plus size={16} />
                    补充筹码
                  </button>
                )}
                {online && state?.you !== state?.host ? (
                  <button
                    className="primary-button"
                    disabled={state?.you === -1}
                    onClick={() =>
                      game.send({ type: "ready", ready: !mine?.ready })
                    }
                  >
                    {state?.you === -1
                      ? "等待入座"
                      : mine?.ready
                        ? "已准备"
                        : "准备"}
                    <Check size={17} />
                  </button>
                ) : (
                  <button
                    className="primary-button start-button"
                    disabled={
                      !state ||
                      (mine?.stack ?? 0) === 0 ||
                      (online && connection !== "online")
                    }
                    onClick={() => game.send({ type: "start" })}
                  >
                    {state?.hand ? "下一手" : "开始游戏"}
                    <ArrowRight size={18} />
                  </button>
                )}
              </div>
            ) : (
              <div className="bet-controls">
                <div className="bet-sizing">
                  <div className="preset-bets">
                    {[
                      ["最小", state?.range?.min ?? 40],
                      [
                        "½ 底池",
                        Math.round(
                          (state?.pot ?? 0) * 0.5 +
                            (mine?.bet ?? 0) +
                            (state?.callAmount ?? 0),
                        ),
                      ],
                      [
                        "底池",
                        (state?.pot ?? 0) +
                          (mine?.bet ?? 0) +
                          (state?.callAmount ?? 0),
                      ],
                    ].map(([label, value]) => (
                      <button
                        key={label}
                        disabled={controlsDisabled || !state?.range}
                        onClick={() =>
                          setRaise(
                            Math.max(
                              state?.range?.min ?? 0,
                              Math.min(state?.range?.max ?? 0, Number(value)),
                            ),
                          )
                        }
                      >
                        {label}
                      </button>
                    ))}
                    <button
                      className="all-in-preset"
                      disabled={controlsDisabled || !state?.range}
                      onClick={() => setRaise(state?.range?.max ?? 0)}
                    >
                      全下
                    </button>
                  </div>
                  <div className="raise-slider">
                    <button
                      aria-label="减少下注"
                      disabled={controlsDisabled || !state?.range}
                      onClick={() =>
                        setRaise((n) =>
                          Math.max(state?.range?.min ?? 0, n - 20),
                        )
                      }
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      aria-label="加注金额滑杆"
                      type="range"
                      min={state?.range?.min ?? 0}
                      max={state?.range?.max ?? 2000}
                      value={raise}
                      disabled={controlsDisabled || !state?.range}
                      onChange={(e) => setRaise(Number(e.target.value))}
                    />
                    <button
                      aria-label="增加下注"
                      disabled={controlsDisabled || !state?.range}
                      onClick={() =>
                        setRaise((n) =>
                          Math.min(state?.range?.max ?? 2000, n + 20),
                        )
                      }
                    >
                      <Plus size={14} />
                    </button>
                    <input
                      className="raise-number"
                      aria-label="加注金额"
                      type="number"
                      value={raise}
                      min={state?.range?.min}
                      max={state?.range?.max}
                      disabled={controlsDisabled || !state?.range}
                      onChange={(e) => setRaise(Number(e.target.value))}
                    />
                  </div>
                </div>
                <div className="action-buttons">
                  <button
                    className="fold-button"
                    disabled={
                      controlsDisabled || !state?.legal.includes("fold")
                    }
                    onClick={() => act("fold")}
                  >
                    <Flag size={17} />
                    <span>弃牌</span>
                  </button>
                  <button
                    className="call-button"
                    disabled={
                      controlsDisabled ||
                      !state?.legal.some((a) => a === "check" || a === "call")
                    }
                    onClick={() =>
                      act(state?.legal.includes("check") ? "check" : "call")
                    }
                  >
                    <Check size={18} />
                    <span>
                      {state?.legal.includes("check") ? "过牌" : "跟注"}
                      {!state?.legal.includes("check") && (
                        <strong>{fmt(state?.callAmount ?? 0)}</strong>
                      )}
                    </span>
                  </button>
                  <button
                    className="raise-button"
                    disabled={
                      controlsDisabled ||
                      !state?.range ||
                      !Number.isSafeInteger(raise) ||
                      raise < state.range.min ||
                      raise > state.range.max
                    }
                    onClick={() => act(aggressive, raise)}
                  >
                    <Plus size={19} />
                    <span>
                      {raise === state?.range?.max
                        ? "全下"
                        : aggressive === "raise"
                          ? "加注至"
                          : "下注"}
                      <strong>{fmt(raise)}</strong>
                    </span>
                  </button>
                </div>
              </div>
            )}
          </section>
          <footer className="status-bar">
            <div>
              <span className="live-dot" />
              <span>
                {online
                  ? connection === "online"
                    ? "已连接"
                    : "连接恢复中"
                  : "离线练习"}
              </span>
              <span className="status-separator" />第{" "}
              {String(state?.hand ?? 0).padStart(3, "0")} 手
              <span className="status-separator" />
              <span className="last-event">
                {state?.log.at(-1) ?? "牌桌已就绪"}
              </span>
            </div>
            <button onClick={() => setPanel("help")}>
              <CircleHelp size={14} />
              <span>牌型与规则</span>
            </button>
          </footer>
        </main>
        <AnimatePresence>
          {game.error && (
            <motion.div
              className="toast"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
              role="alert"
            >
              {game.error}
              <button aria-label="关闭提示" onClick={() => game.setError("")}>
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {panel && (
            <motion.div
              className="modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPanel(null)}
            >
              <motion.section
                className={`modal ${panel === "history" ? "history-modal" : ""}`}
                initial={{ y: 15, scale: 0.98 }}
                animate={{ y: 0, scale: 1 }}
                role="dialog"
                aria-modal="true"
                aria-label={
                  {
                    rooms: "好友牌局",
                    settings: "牌桌设置",
                    history: "牌局记录",
                    help: "牌型与规则",
                  }[panel]
                }
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setPanel(null);
                }}
              >
                <div className="modal-header">
                  <div>
                    <span className="small-label">RIVER CLUB</span>
                    <h2>
                      {
                        {
                          rooms: "好友牌局",
                          settings: "牌桌设置",
                          history: "牌局记录",
                          help: "牌型与规则",
                        }[panel]
                      }
                    </h2>
                  </div>
                  <button
                    className="icon-button"
                    aria-label="关闭"
                    onClick={() => setPanel(null)}
                  >
                    <X size={20} />
                  </button>
                </div>
                {panel === "rooms" &&
                  (online ? (
                    <>
                      <div className="room-share">
                        <span>房间码</span>
                        <strong>{state.roomCode}</strong>
                        <button
                          className="secondary-button"
                          onClick={() => void copyCode()}
                        >
                          {copied ? <Check size={16} /> : <Copy size={16} />}
                          {copied ? "已复制" : "复制房间码"}
                        </button>
                      </div>
                      <div className="room-players">
                        {state.players
                          .filter((p) => !p.bot)
                          .map((p) => (
                            <div key={p.seat}>
                              <img
                                src={`./assets/avatar-${p.seat}.webp`}
                                alt=""
                              />
                              <strong>{p.name}</strong>
                              <span>
                                {p.seat === state.host
                                  ? "房主"
                                  : p.ready
                                    ? "已准备"
                                    : "未准备"}
                              </span>
                            </div>
                          ))}
                      </div>
                      <button
                        className="danger-button"
                        onClick={() => {
                          void game.leave();
                          setPanel(null);
                        }}
                      >
                        <LogOut size={16} />
                        离开房间
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="segmented">
                        <button
                          className={roomTab === "create" ? "selected" : ""}
                          onClick={() => setRoomTab("create")}
                        >
                          创建房间
                        </button>
                        <button
                          className={roomTab === "join" ? "selected" : ""}
                          onClick={() => setRoomTab("join")}
                        >
                          加入房间
                        </button>
                      </div>
                      <label className="field">
                        昵称
                        <input
                          value={name}
                          maxLength={16}
                          onChange={(e) => setNameValue(e.target.value)}
                        />
                      </label>
                      <label className="field">
                        服务器地址
                        <input
                          value={server}
                          placeholder="https://poker.example.com"
                          onChange={(e) => setServer(e.target.value)}
                        />
                      </label>
                      {roomTab === "join" && (
                        <label className="field">
                          房间码
                          <input
                            className="code-input"
                            inputMode="numeric"
                            maxLength={6}
                            value={roomCode}
                            placeholder="000000"
                            onChange={(e) =>
                              setRoomCode(e.target.value.replace(/\D/g, ""))
                            }
                          />
                        </label>
                      )}
                      <div className="room-facts">
                        <span>
                          <Users size={16} />
                          六人牌桌
                        </span>
                        <span>
                          <ShieldCheck size={16} />
                          虚拟筹码
                        </span>
                        <span>10 / 20</span>
                      </div>
                      <button
                        className="primary-button full-width"
                        disabled={
                          roomBusy ||
                          (roomTab === "join" && roomCode.length !== 6)
                        }
                        onClick={() => void joinRoom()}
                      >
                        {roomBusy
                          ? "连接中…"
                          : roomTab === "create"
                            ? "创建牌桌"
                            : "加入牌桌"}
                        <ArrowRight size={17} />
                      </button>
                      {read("session", null) && (
                        <button
                          className="text-button"
                          disabled={roomBusy}
                          onClick={() => void joinRoom(true)}
                        >
                          恢复上次房间
                        </button>
                      )}
                    </>
                  ))}
                {panel === "settings" && (
                  <>
                    <label className="field">
                      玩家昵称
                      <input
                        value={name}
                        maxLength={16}
                        onChange={(e) => setNameValue(e.target.value)}
                      />
                    </label>
                    <div className="setting-row">
                      <span>游戏音效</span>
                      <button
                        className={`toggle ${settings.sound ? "on" : ""}`}
                        role="switch"
                        aria-label="游戏音效"
                        aria-checked={settings.sound}
                        onClick={() =>
                          setSettings((s) => ({ ...s, sound: !s.sound }))
                        }
                      >
                        <i />
                      </button>
                    </div>
                    <div className="setting-row">
                      <span>音量</span>
                      <input
                        aria-label="音量"
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={settings.volume}
                        onChange={(e) =>
                          setSettings((s) => ({
                            ...s,
                            volume: Number(e.target.value),
                          }))
                        }
                      />
                    </div>
                    <div className="setting-row">
                      <span>减少动态效果</span>
                      <button
                        className={`toggle ${settings.reduced ? "on" : ""}`}
                        role="switch"
                        aria-label="减少动态效果"
                        aria-checked={settings.reduced}
                        onClick={() =>
                          setSettings((s) => ({ ...s, reduced: !s.reduced }))
                        }
                      >
                        <i />
                      </button>
                    </div>
                    <div className="setting-row">
                      <span>AI 难度</span>
                      <div className="segmented compact-segment">
                        {(["casual", "standard"] as const).map((v) => (
                          <button
                            key={v}
                            disabled={online}
                            className={
                              settings.difficulty === v ? "selected" : ""
                            }
                            onClick={() =>
                              setSettings((s) => ({ ...s, difficulty: v }))
                            }
                          >
                            {v === "casual" ? "休闲" : "标准"}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="setting-row">
                      <span>练习速度</span>
                      <div className="segmented compact-segment">
                        {[1, 2, 3].map((v) => (
                          <button
                            key={v}
                            disabled={online}
                            className={settings.speed === v ? "selected" : ""}
                            onClick={() =>
                              setSettings((s) => ({ ...s, speed: v }))
                            }
                          >
                            {v}×
                          </button>
                        ))}
                      </div>
                    </div>
                    <button
                      className="primary-button full-width"
                      onClick={() => setPanel(null)}
                    >
                      完成
                      <Check size={17} />
                    </button>
                  </>
                )}
                {panel === "history" && (
                  <div className="history-list">
                    {!records.length ? (
                      <div className="empty-history">
                        <History size={38} />
                        <h3>尚无牌局记录</h3>
                        <span>完成第一手牌后，结果将显示在这里。</span>
                      </div>
                    ) : (
                      records.map((record, i) => (
                        <div
                          className="history-item"
                          key={`${record.time}-${i}`}
                        >
                          <button
                            onClick={() =>
                              setExpandedHand(expandedHand === i ? null : i)
                            }
                          >
                            <span className="history-hand">
                              #{String(record.hand).padStart(3, "0")}
                            </span>
                            <span className="history-winner">
                              <strong>
                                {record.winners.map((w) => w.name).join("、")}
                              </strong>
                              <small>
                                {record.winners[0]?.handName} · 底池{" "}
                                {fmt(record.pot)}
                              </small>
                            </span>
                            <span
                              className={
                                (record.net[record.you] ?? 0) >= 0
                                  ? "profit"
                                  : "loss"
                              }
                            >
                              {(record.net[record.you] ?? 0) >= 0 ? "+" : ""}
                              {fmt(record.net[record.you] ?? 0)}
                            </span>
                            <ChevronDown size={16} />
                          </button>
                          {expandedHand === i && (
                            <div className="history-detail">
                              <div className="history-board">
                                {record.board.map((c, j) => (
                                  <PlayingCard card={c} key={j} small />
                                ))}
                              </div>
                              {record.winners.map((w) => (
                                <p key={w.seat}>
                                  {w.name} · {w.handName} · +{fmt(w.amount)}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
                {panel === "help" && (
                  <div className="rules-content">
                    <p>
                      每位玩家获得 2 张底牌，与 5 张公共牌组合出最好的 5
                      张牌。可以使用任意数量的底牌。
                    </p>
                    <div className="hand-ranks">
                      {[
                        ["皇家同花顺", "A K Q J 10", "同一花色"],
                        ["同花顺", "9 8 7 6 5", "同花且连续"],
                        ["四条", "A A A A K", "四张相同点数"],
                        ["葫芦", "K K K 8 8", "三条加一对"],
                        ["同花", "A J 8 5 2", "五张同一花色"],
                        ["顺子", "8 7 6 5 4", "五张连续点数"],
                        ["三条", "Q Q Q 9 2", "三张相同点数"],
                        ["两对", "J J 7 7 A", "两组对子"],
                        ["一对", "A A J 8 3", "两张相同点数"],
                        ["高牌", "A J 9 6 2", "比较最大牌"],
                      ].map(([title, cards, detail], i) => (
                        <div key={title}>
                          <span>{String(i + 1).padStart(2, "0")}</span>
                          <strong>{title}</strong>
                          <code>{cards}</code>
                          <small>{detail}</small>
                        </div>
                      ))}
                    </div>
                    <p>
                      行动依次经过翻牌前、翻牌、转牌与河牌。全下后按照投入筹码建立边池；相同牌力平分底池。A
                      可以组成 A–2–3–4–5 顺子。
                    </p>
                    <p>
                      行动限时 25
                      秒，超时自动过牌；无法过牌时弃牌。真人在每手结束后入座，筹码不足可在手间补充至
                      2,000。
                    </p>
                  </div>
                )}
              </motion.section>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
