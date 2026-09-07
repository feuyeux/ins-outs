import { Table } from "poker-ts";
import solver from "pokersolver";
import type {
  Action,
  Card,
  Command,
  HandResult,
  PlayerView,
  RoomSnapshot,
  Stage,
} from "./types";
import { ACTION_NAMES, HAND_NAMES } from "./types";

const BOT_NAMES = ["你", "Oliver", "Sofia", "James", "Luna", "Leo"];
const { Hand } = solver;
export class Game {
  table = new Table({ smallBlind: 10, bigBlind: 20 }, 6);
  version = 0;
  hand = 0;
  stage: Stage = "waiting";
  dealer = 0;
  deadline = 0;
  board: Card[] = [];
  holes: (Card[] | null)[] = [];
  folded = new Set<number>();
  result?: HandResult;
  history: HandResult[] = [];
  log: string[] = [];
  difficulty: "casual" | "standard" = "standard";
  speed = 1;
  roomCode = "";
  host = 0;
  starting: number[] = [];
  settledPots: RoomSnapshot["pots"] = [];
  players = BOT_NAMES.map((name, seat) => ({
    seat,
    name,
    bot: seat !== 0,
    connected: true,
    ready: true,
    lastAction: "",
  }));
  private seen = new Set<string>();
  private fullRaise = 20;
  private biggestBet = 20;
  private actedAt = new Map<number, number>();
  constructor(name = "你") {
    this.players[0].name = name;
    for (let i = 0; i < 6; i++) this.table.sitDown(i, 2000);
  }
  get active() {
    return this.table.isHandInProgress();
  }
  get actor() {
    return this.active && this.table.isBettingRoundInProgress()
      ? this.table.playerToAct()
      : -1;
  }
  append(text: string) {
    this.log = [...this.log, text].slice(-30);
  }
  start() {
    if (this.active) throw new Error("本手尚未结束");
    for (const p of this.players) {
      const stack = this.table.seats()[p.seat]?.stack ?? 0;
      if (stack === 0 && p.bot) this.rebuy(p.seat);
    }
    if (this.table.seats().filter((p) => p && p.stack > 0).length < 2)
      throw new Error("至少需要两位有筹码的玩家");
    this.starting = this.table.seats().map((p) => p?.stack ?? 0);
    this.folded.clear();
    this.result = undefined;
    this.settledPots = [];
    this.fullRaise = 20;
    this.biggestBet = 20;
    this.actedAt.clear();
    this.players.forEach((p) => {
      p.lastAction = "";
    });
    this.table.startHand();
    this.hand++;
    this.dealer = this.table.button();
    this.holes = this.table.holeCards();
    this.board = [];
    this.stage = "preflop";
    this.append(`第 ${this.hand} 手 · 盲注 10 / 20`);
    const playing = this.table
      .seats()
      .map((p, i) => (p && this.starting[i] > 0 ? i : -1))
      .filter((i) => i >= 0);
    const next = (seat: number) =>
      playing[(playing.indexOf(seat) + 1) % playing.length];
    const sb = playing.length === 2 ? this.dealer : next(this.dealer);
    this.players[sb].lastAction = "小盲";
    this.players[next(sb)].lastAction = "大盲";
    this.advance();
    this.version++;
    this.deadline = Date.now() + 25000;
  }
  rebuy(seat: number) {
    if (this.active) throw new Error("请在本手结束后补充筹码");
    const stack = this.table.seats()[seat]?.stack ?? 0;
    if (stack >= 2000) throw new Error("筹码已充足");
    if (this.table.seats()[seat]) this.table.standUp(seat);
    this.table.sitDown(seat, 2000);
    this.version++;
  }
  execute(seat: number, message: Command) {
    if (message.type === "action") {
      const c = message.command;
      if (
        !c ||
        typeof c.id !== "string" ||
        c.id.length < 1 ||
        c.id.length > 100
      )
        throw new Error("无效操作编号");
      const actionId = `${seat}:${c.id}`;
      if (this.seen.has(actionId)) return;
      if (c.version !== this.version) throw new Error("牌局已更新，请重试");
      this.act(seat, c.action, c.amount);
      this.seen.add(actionId);
      if (this.seen.size > 1000)
        this.seen.delete(this.seen.values().next().value!);
    } else if (message.type === "start") {
      if (seat !== this.host) throw new Error("等待房主开局");
      if (this.players.some((p) => !p.bot && !p.ready && p.connected))
        throw new Error("等待玩家准备");
      this.start();
    } else if (message.type === "rebuy") this.rebuy(seat);
    else if (message.type === "ready") {
      this.players[seat].ready = !!message.ready;
      this.version++;
    } else if (message.type === "profile") {
      this.players[seat].name = cleanName(message.name);
      this.version++;
    } else if (message.type === "settings") {
      if (this.roomCode) throw new Error("联网牌桌使用标准速度");
      this.difficulty = message.difficulty === "casual" ? "casual" : "standard";
      this.speed = [1, 2, 3].includes(message.speed) ? message.speed : 1;
      this.version++;
    }
  }
  act(seat: number, action: Action, amount?: number) {
    if (seat !== this.actor) throw new Error("还未轮到你");
    const legal = this.legalActions();
    if (!legal.actions.includes(action)) throw new Error("此操作当前不可用");
    if (action === "bet" || action === "raise") {
      if (
        !Number.isSafeInteger(amount) ||
        !legal.chipRange ||
        amount! < legal.chipRange.min ||
        amount! > legal.chipRange.max
      )
        throw new Error("下注金额超出范围");
    }
    const before = this.table.seats()[seat]!;
    const amountLabel =
      action === "bet" || action === "raise"
        ? ` ${amount}`
        : action === "call"
          ? ` ${this.snapshot(seat).callAmount}`
          : "";
    this.players[seat].lastAction =
      amount === before.totalChips && ["raise", "bet"].includes(action)
        ? "全下"
        : ACTION_NAMES[action] + amountLabel;
    this.append(
      `${this.players[seat].name} · ${this.players[seat].lastAction}`,
    );
    if (action === "fold") this.folded.add(seat);
    // A short all-in does not lower the minimum raise or reopen prior action.
    if (action === "bet" || action === "raise") {
      const increment = amount! - this.biggestBet;
      if (increment >= this.fullRaise) this.fullRaise = increment;
      this.biggestBet = amount!;
    }
    if (action !== "check" || this.biggestBet > 0)
      this.actedAt.set(seat, this.biggestBet);
    this.table.actionTaken(action, amount);
    this.advance();
    this.version++;
    this.deadline = Date.now() + 25000;
  }
  private legalActions(): {
    actions: Action[];
    chipRange?: { min: number; max: number };
  } {
    const legal = this.table.legalActions();
    const actor = this.actor;
    const acted = this.actedAt.get(actor);
    const canReopen =
      acted === undefined || this.biggestBet - acted >= this.fullRaise;
    const actions = legal.actions.filter(
      (a) => canReopen || (a !== "raise" && a !== "bet"),
    );
    const max = this.table.seats()[actor]!.totalChips;
    return {
      actions,
      chipRange: actions.some((a) => a === "raise" || a === "bet")
        ? { min: Math.min(max, this.biggestBet + this.fullRaise), max }
        : undefined,
    };
  }
  private advance() {
    while (this.active && !this.table.isBettingRoundInProgress()) {
      if (this.table.areBettingRoundsCompleted()) {
        this.settle();
        break;
      }
      this.table.endBettingRound();
      this.board = this.table.communityCards();
      if (this.table.areBettingRoundsCompleted()) {
        this.settle();
        break;
      }
      this.stage = this.table.roundOfBetting();
      this.fullRaise = 20;
      this.biggestBet = 0;
      this.actedAt.clear();
      this.players.forEach((p) => {
        if (!this.folded.has(p.seat)) p.lastAction = "";
      });
      this.append(
        { flop: "翻牌", turn: "转牌", river: "河牌", preflop: "翻牌前" }[
          this.stage
        ],
      );
    }
    if (this.active) {
      this.stage = this.table.roundOfBetting();
      this.board = this.table.communityCards();
    }
  }
  private settle() {
    this.board = this.table.communityCards();
    const before = this.table.seats().map((p) => p?.stack ?? 0);
    const contributed = this.starting.map((n, i) => n - before[i]);
    const payout = Array(6).fill(0) as number[];
    const refunds = Array(6).fill(0) as number[];
    const levels = [...new Set(contributed.filter((n) => n > 0))].sort(
      (a, b) => a - b,
    );
    const won = new Map<number, { handName: string; cards: Card[] }>();
    const code = (c: Card) => c.rank + c.suit[0];
    this.settledPots = [];
    let previous = 0;
    // Track every contribution, including folds; the engine can lose all-in
    // players from earlier streets when it distributes a later side pot.
    for (const level of levels) {
      const contributors = contributed
        .map((n, i) => (n >= level ? i : -1))
        .filter((i) => i >= 0);
      const size = (level - previous) * contributors.length;
      previous = level;
      if (contributors.length === 1) {
        refunds[contributors[0]] += size;
        continue;
      }
      const eligiblePlayers = contributors.filter((i) => !this.folded.has(i));
      if (!eligiblePlayers.length) throw new Error("底池没有合法获胜者");
      this.settledPots.push({ size, eligiblePlayers });
      const hands =
        eligiblePlayers.length > 1
          ? eligiblePlayers.map((i) =>
              Hand.solve([...(this.holes[i] ?? []), ...this.board].map(code)),
            )
          : [];
      const winning = hands.length
        ? Hand.winners(hands).map((h) => eligiblePlayers[hands.indexOf(h)])
        : eligiblePlayers;
      const share = Math.floor(size / winning.length);
      let remainder = size % winning.length;
      const order = [...winning].sort(
        (a, b) => ((a - this.dealer + 5) % 6) - ((b - this.dealer + 5) % 6),
      );
      for (const seat of order) {
        payout[seat] += share + (remainder-- > 0 ? 1 : 0);
        const h = hands[eligiblePlayers.indexOf(seat)];
        const allCards = [...(this.holes[seat] ?? []), ...this.board];
        const award = {
          handName: h
            ? h.descr === "Royal Flush"
              ? "皇家同花顺"
              : HAND_NAMES[Math.min(9, h.rank - 1)]
            : "其他玩家弃牌",
          cards: h
            ? allCards.filter((c) =>
                h.cards.some(
                  (s) =>
                    (s.value === "10" ? "T" : s.value) === c.rank &&
                    s.suit === c.suit[0],
                ),
              )
            : [],
        };
        if (!won.has(seat) || h) won.set(seat, award);
      }
    }
    this.table.showdown();
    const after = before.map((n, i) => n + payout[i] + refunds[i]);
    for (let seat = 0; seat < 6; seat++) {
      if (this.table.seats()[seat]) this.table.standUp(seat);
      if (after[seat] > 0) this.table.sitDown(seat, after[seat]);
    }
    this.result = {
      hand: this.hand,
      board: this.board,
      pot: this.settledPots.reduce((n, p) => n + p.size, 0),
      time: Date.now(),
      winners: [...won].map(([seat, h]) => ({
        seat,
        name: this.players[seat].name,
        amount: payout[seat],
        ...h,
      })),
      net: after.map((n, i) => n - this.starting[i]),
    };
    this.history = [this.result, ...this.history].slice(0, 30);
    this.stage = "finished";
    this.append(
      this.result.winners.map((w) => `${w.name} 赢得 ${w.amount}`).join(" · "),
    );
  }
  snapshot(you: number): RoomSnapshot {
    const seats = this.table.seats();
    const legal =
      this.actor >= 0 && this.actor === you
        ? this.legalActions()
        : { actions: [] };
    const showdown =
      this.stage === "finished" &&
      this.board.length === 5 &&
      this.holes.filter((cards, seat) => cards && !this.folded.has(seat)).length > 1;
    const players: PlayerView[] = this.players.map((p) => ({
      ...p,
      stack: seats[p.seat]?.stack ?? 0,
      bet: seats[p.seat]?.betSize ?? 0,
      folded: this.folded.has(p.seat),
      inHand: !!this.holes[p.seat]?.length,
      cards:
        p.seat === you || (showdown && !this.folded.has(p.seat))
          ? (this.holes[p.seat] ?? [])
          : [],
    }));
    const pots = this.active ? this.table.pots() : this.settledPots;
    const pot =
      this.stage === "finished"
        ? (this.result?.pot ?? 0)
        : this.active
          ? this.starting.reduce((n, p, i) => n + p - players[i].stack, 0)
          : 0;
    const mine = seats[you];
    return {
      version: this.version,
      hand: this.hand,
      stage: this.stage,
      players,
      board: this.board,
      pot,
      pots,
      dealer: this.dealer,
      actor: this.actor,
      you,
      host: this.host,
      roomCode: this.roomCode,
      legal: legal.actions,
      range:
        "chipRange" in legal && legal.chipRange
          ? { min: legal.chipRange.min, max: legal.chipRange.max }
          : undefined,
      callAmount: mine
        ? Math.min(
            mine.stack,
            Math.max(...players.map((p) => p.bet)) - mine.betSize,
          )
        : 0,
      deadline: this.deadline,
      result: this.result,
      history: this.history,
      log: this.log,
      difficulty: this.difficulty,
    };
  }
}
export function cleanName(value: unknown) {
  if (typeof value !== "string") return "玩家";
  return (
    value
      .trim()
      .replace(/[\x00-\x1f]/g, "")
      .slice(0, 16) || "玩家"
  );
}
