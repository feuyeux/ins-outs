import solver from "pokersolver";
import type { Action, Card, RoomSnapshot } from "./types";

const code = (c: Card) => c.rank + c.suit[0];
const { Hand } = solver;
export function decide(view: RoomSnapshot): {
  action: Action;
  amount?: number;
} {
  const { legal, range } = view;
  const me = view.players[view.you];
  const known = [...me.cards, ...view.board].map(code);
  const deck = [..."23456789TJQKA"]
    .flatMap((r) => [..."cdhs"].map((s) => r + s))
    .filter((c) => !known.includes(c));
  const opponents = view.players.filter(
    (p) => p.seat !== view.you && !p.folded && p.inHand,
  ).length;
  let wins = 0;
  const trials = view.difficulty === "casual" ? 20 : 64;
  for (let t = 0; t < trials; t++) {
    const pool = [...deck];
    const draw = () =>
      pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    const board = view.board.map(code);
    while (board.length < 5) board.push(draw());
    const mine = Hand.solve([...me.cards.map(code), ...board]);
    const hands = [mine];
    for (let i = 0; i < Math.max(1, opponents); i++)
      hands.push(Hand.solve([draw(), draw(), ...board]));
    const winners = Hand.winners(hands);
    if (winners.includes(mine)) wins += 1 / winners.length;
  }
  const equity = wins / trials;
  const odds = view.callAmount / Math.max(1, view.pot + view.callAmount);
  const aggression = view.you % 3 === 0 ? 0.08 : 0;
  const raising = legal.includes("raise")
    ? "raise"
    : legal.includes("bet")
      ? "bet"
      : undefined;
  if (
    raising &&
    range &&
    (equity > 0.55 - aggression ||
      Math.random() < (view.difficulty === "casual" ? 0.025 : 0.07))
  ) {
    const target =
      Math.round(
        (me.bet +
          view.callAmount +
          Math.max(40, view.pot * (equity > 0.8 ? 0.85 : 0.5))) /
          10,
      ) * 10;
    return {
      action: raising,
      amount: Math.max(range.min, Math.min(range.max, target)),
    };
  }
  if (legal.includes("check")) return { action: "check" };
  if (
    legal.includes("call") &&
    (equity + (view.difficulty === "casual" ? 0.12 : 0.04) >= odds ||
      (view.callAmount <= 20 && equity > 0.1))
  )
    return { action: "call" };
  return { action: "fold" };
}
