import { describe, expect, it, vi } from "vitest";
import type { Card } from '../shared/types';
import { Game } from "../shared/game";
import { decide } from "../shared/ai";
import { Hand } from "pokersolver";

function passive(game: Game) {
  let steps = 0;
  while (game.active && steps++ < 100) {
    const s = game.snapshot(game.actor);
    game.act(game.actor, s.legal.includes("check") ? "check" : "call");
  }
  expect(steps).toBeLessThan(100);
}
describe("poker rules and adapter", () => {
  it('pays a short all-in winner from the main pot and returns unmatched chips', () => {
    const g = new Game();
    for (let seat = 0; seat < 6; seat++) { g.table.standUp(seat); g.table.sitDown(seat, (seat + 1) * 100); }
    g.start();
    g.holes[0] = [{ rank: 'A', suit: 'spades' }, { rank: 'K', suit: 'spades' }];
    const board: Card[] = [{ rank: 'Q', suit: 'spades' }, { rank: 'J', suit: 'spades' }, { rank: 'T', suit: 'spades' }, { rank: '2', suit: 'clubs' }, { rank: '3', suit: 'clubs' }];
    for (let seat = 1; seat < 6; seat++) g.holes[seat] = [{ rank: String(seat + 3) as Card['rank'], suit: 'hearts' }, { rank: String(seat + 3) as Card['rank'], suit: 'diamonds' }];
    vi.spyOn(g.table, 'communityCards').mockReturnValue(board);
    while (g.active) { const s = g.snapshot(g.actor); g.act(g.actor, s.range ? s.legal.includes('raise') ? 'raise' : 'bet' : s.legal.includes('call') ? 'call' : 'check', s.range?.max); }
    expect(g.table.seats()[0]?.stack).toBe(600);
    expect(g.result!.winners.find(w => w.seat === 0)?.handName).toBe('皇家同花顺');
    expect(g.result!.pot).toBe(2000);
    expect(g.table.seats().reduce((sum, p) => sum + (p?.stack ?? 0), 0)).toBe(2100);
  });
  it('splits a board tie including folded money and pays odd chips clockwise', () => {
    const g = new Game(); g.start();
    for (let seat = 0; seat < 6; seat++) g.holes[seat] = [{ rank: String(seat + 2) as Card['rank'], suit: 'hearts' }, { rank: String(seat + 2) as Card['rank'], suit: 'diamonds' }];
    const board: Card[] = ['A', 'K', 'Q', 'J', 'T'].map(rank => ({ rank: rank as Card['rank'], suit: 'spades' }));
    vi.spyOn(g.table, 'communityCards').mockReturnValue(board);
    g.act(3, 'raise', 41); g.act(4, 'call'); g.act(5, 'call'); g.act(0, 'call'); g.act(1, 'fold'); g.act(2, 'fold');
    passive(g);
    expect(g.result!.pot).toBe(194);
    expect(g.result!.winners.map(w => [w.seat, w.amount]).sort((a,b) => a[0]-b[0])).toEqual([[0,48],[3,49],[4,49],[5,48]]);
  });
  it("plays 1,000 randomized hands with unique cards, bounded turns and conserved chips", () => {
    let seed = 34567;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0x100000000;
    };
    for (let hand = 0; hand < 1000; hand++) {
      const g = new Game();
      if (hand % 2)
        for (let i = 0; i < 6; i++) {
          g.table.standUp(i);
          g.table.sitDown(i, 1 + Math.floor(random() * 3000));
        }
      const total = g.table.seats().reduce((n, p) => n + (p?.stack ?? 0), 0);
      g.start();
      let steps = 0;
      while (g.active && steps++ < 200) {
        const view = g.snapshot(g.actor);
        const cards = [...g.holes.flatMap((c) => c ?? []), ...g.board].map(
          (c) => c.rank + c.suit,
        );
        expect(new Set(cards).size).toBe(cards.length);
        const a = view.legal[Math.floor(random() * view.legal.length)];
        const amount = view.range
          ? random() > 0.75
            ? view.range.max
            : view.range.min
          : undefined;
        g.act(g.actor, a, amount);
      }
      expect(steps).toBeLessThan(200);
      expect(g.stage).toBe("finished");
      expect(
        g.table.seats().reduce((n, p) => n + (p?.stack ?? 0), 0),
        JSON.stringify({
          hand,
          initial: g.starting,
          seats: g.table.seats(),
          result: g.result,
          pots: g.settledPots,
          log: g.log,
        }),
      ).toBe(total);
      expect(g.result!.net.reduce((n, p) => n + p, 0)).toBe(0);
      expect(g.result!.winners.reduce((n, w) => n + w.amount, 0)).toBe(
        g.result!.pot,
      );
    }
  });
  it("rejects out-of-turn, invalid amounts and stale commands; applies duplicates once", () => {
    const g = new Game();
    g.start();
    expect(() => g.act(0, "check")).toThrow();
    expect(() => g.act(g.actor, "check")).toThrow();
    expect(() => g.act(g.actor, "raise", 39)).toThrow();
    expect(() => g.act(g.actor, "raise", NaN)).toThrow();
    const message = {
      type: "action" as const,
      command: { id: "once", version: g.version, action: "call" as const },
    };
    const actor = g.actor;
    g.execute(actor, message);
    const v = g.version;
    g.execute(actor, message);
    expect(g.version).toBe(v);
    expect(() =>
      g.execute(g.actor, {
        ...message,
        command: { ...message.command, id: "stale" },
      }),
    ).toThrow("牌局已更新");
  });
  it("hides other hole cards and returns only public showdown information", () => {
    const g = new Game();
    g.start();
    expect(g.snapshot(0).players[0].cards).toHaveLength(2);
    expect(
      g
        .snapshot(0)
        .players.slice(1)
        .every((p) => !p.cards.length),
    ).toBe(true);
    expect(g.snapshot(-1).players.every((p) => !p.cards.length)).toBe(true);
    passive(g);
    expect(g.board).toHaveLength(5);
    expect(g.snapshot(0).players.every((p) => p.cards.length === 2)).toBe(true);
  });
  it("settles an uncontested hand without revealing the winner cards", () => {
    const g = new Game();
    g.start();
    while (g.active) g.act(g.actor, "fold");
    expect(g.result!.winners).toHaveLength(1);
    expect(g.result!.winners[0].cards).toHaveLength(0);
    expect(g.board).toHaveLength(0);
    expect(g.snapshot(-1).players.every((p) => !p.cards.length)).toBe(true);
  });
  it("preserves minimum raises and does not reopen betting after a short all-in", () => {
    const g = new Game();
    g.table.standUp(4);
    g.table.sitDown(4, 110);
    g.start();
    g.act(3, "raise", 100);
    g.act(4, "raise", 110);
    expect(g.snapshot(5).range?.min).toBe(190);
    for (const seat of [5, 0, 1, 2]) g.act(seat, "call");
    expect(g.actor).toBe(3);
    expect(g.snapshot(3).legal).not.toContain("raise");
    g.act(3, "call");
    passive(g);
  });
  it("constructs side pots for unequal all-ins and awards all chips", () => {
    const g = new Game();
    for (let i = 0; i < 6; i++) {
      g.table.standUp(i);
      g.table.sitDown(i, (i + 1) * 100);
    }
    g.start();
    while (g.active) {
      const v = g.snapshot(g.actor);
      if (v.range)
        g.act(
          g.actor,
          v.legal.includes("raise") ? "raise" : "bet",
          v.range.max,
        );
      else g.act(g.actor, v.legal.includes("call") ? "call" : "check");
    }
    expect(g.settledPots.length).toBeGreaterThan(1);
    expect(g.table.seats().reduce((n, p) => n + (p?.stack ?? 0), 0)).toBe(2100);
  });
  it("supports wheel straights, ties and five-card board winners", () => {
    expect(Hand.solve(["As", "2h", "3c", "4d", "5s", "Kh", "Qh"]).name).toBe(
      "Straight",
    );
    const board = ["As", "Ks", "Qs", "Js", "Ts"];
    expect(
      Hand.winners([
        Hand.solve([...board, "2d", "3d"]),
        Hand.solve([...board, "9h", "9c"]),
      ]),
    ).toHaveLength(2);
  });
  it("rotates the dealer and restores busted seats between hands", () => {
    const g = new Game();
    g.start();
    passive(g);
    const dealer = g.dealer;
    g.start();
    expect(g.dealer).toBe((dealer + 1) % 6);
    passive(g);
    if (g.table.seats()[0]) g.table.standUp(0);
    g.rebuy(0);
    expect(g.table.seats()[0]?.stack).toBe(2000);
  });
  it("AI chooses a legal action using only its player view", () => {
    const g = new Game();
    g.start();
    const view = g.snapshot(g.actor);
    const a = decide(view);
    expect(view.legal).toContain(a.action);
    expect(() => g.act(g.actor, a.action, a.amount)).not.toThrow();
  });
});
