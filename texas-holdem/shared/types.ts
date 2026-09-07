export type { Card, Action } from "poker-ts/dist/facade/poker";
import type { Card, Action } from "poker-ts/dist/facade/poker";

export type Stage =
  "waiting" | "preflop" | "flop" | "turn" | "river" | "finished";
export interface PlayerView {
  seat: number;
  name: string;
  bot: boolean;
  connected: boolean;
  ready: boolean;
  stack: number;
  bet: number;
  folded: boolean;
  inHand: boolean;
  cards: Card[];
  lastAction: string;
}
export interface HandResult {
  hand: number;
  winners: {
    seat: number;
    name: string;
    amount: number;
    handName: string;
    cards: Card[];
  }[];
  board: Card[];
  pot: number;
  time: number;
  net: number[];
}
export interface RoomSnapshot {
  version: number;
  hand: number;
  stage: Stage;
  players: PlayerView[];
  board: Card[];
  pot: number;
  pots: { size: number; eligiblePlayers: number[] }[];
  dealer: number;
  actor: number;
  you: number;
  host: number;
  roomCode: string;
  legal: Action[];
  range?: { min: number; max: number };
  callAmount: number;
  deadline: number;
  result?: HandResult;
  history: HandResult[];
  log: string[];
  difficulty: "casual" | "standard";
}
export interface ActionCommand {
  id: string;
  version: number;
  action: Action;
  amount?: number;
}
export type Command =
  | { type: "start" }
  | { type: "action"; command: ActionCommand }
  | { type: "ready"; ready: boolean }
  | { type: "rebuy" }
  | { type: "settings"; difficulty: "casual" | "standard"; speed: number }
  | { type: "profile"; name: string };
export interface Session {
  roomCode: string;
  token: string;
  seat: number;
}
export interface Reply {
  ok: boolean;
  error?: string;
  session?: Session;
}
export const HAND_NAMES = [
  "高牌",
  "一对",
  "两对",
  "三条",
  "顺子",
  "同花",
  "葫芦",
  "四条",
  "同花顺",
  "皇家同花顺",
];
export const ACTION_NAMES: Record<Action, string> = {
  fold: "弃牌",
  check: "过牌",
  call: "跟注",
  bet: "下注",
  raise: "加注",
};
