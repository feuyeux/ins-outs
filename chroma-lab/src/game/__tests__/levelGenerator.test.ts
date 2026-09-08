import { describe, expect, it } from 'vitest';
import {
  HIDDEN_START_LEVEL,
  MAX_HIDDEN_LAYERS,
  TALL_COLOR,
  buildCapacities,
  buildHiddenMask,
  capacitiesFor,
  clearLevelCache,
  createRng,
  filledBottleCount,
  generateLevel,
  getBottleDecors,
  getLevelConfig,
  tallIndexOf,
  totalUnits,
} from '../levelGenerator';
import { hiddenRemaining, isValidMask } from '../hidden';
import { BOTTLE_CAPACITY, isSolved, pour } from '../logic';
import { isSolvable, solve } from '../solver';
import { MAX_COLORS } from '../colors';
import type { Board } from '../types';

/** 关卡牌面 + 对应容量表 */
function loadLevel(level: number): { board: Board; caps: number[] } {
  const board = generateLevel(level);
  return { board, caps: capacitiesFor(level, board.length) };
}

describe('createRng 确定性随机', () => {
  it('同种子产生相同序列', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = [a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it('不同种子产生不同序列', () => {
    const a = createRng(1);
    const b = createRng(2);
    expect(a()).not.toBe(b());
  });

  it('输出落在 [0,1) 区间', () => {
    const rng = createRng(7);
    for (let i = 0; i < 200; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('getLevelConfig 难度曲线', () => {
  it('第 1 关为 3 色 2 空瓶，大瓶容量 6，无未知色', () => {
    expect(getLevelConfig(1)).toEqual({
      level: 1,
      colorCount: 3,
      emptyCount: 2,
      tallCapacity: 6,
      tallColor: TALL_COLOR,
      hiddenCount: 0,
    });
  });

  it('未知色第 7 关登场，每 3 关多藏 1 层并封顶', () => {
    expect(getLevelConfig(6).hiddenCount).toBe(0);
    expect(getLevelConfig(HIDDEN_START_LEVEL).hiddenCount).toBe(1);
    expect(getLevelConfig(10).hiddenCount).toBe(2);
    expect(getLevelConfig(13).hiddenCount).toBe(3);
    expect(getLevelConfig(999).hiddenCount).toBe(MAX_HIDDEN_LAYERS);
  });

  it('颜色数随关卡递增且不超过调色板上限', () => {
    const early = getLevelConfig(3).colorCount;
    const mid = getLevelConfig(11).colorCount;
    expect(mid).toBeGreaterThan(early);
    expect(getLevelConfig(999).colorCount).toBe(MAX_COLORS);
  });

  it('大瓶随关卡长高，容量恒为 4 的倍数加 2', () => {
    const caps = [1, 5, 9, 13, 40].map((l) => getLevelConfig(l).tallCapacity);
    expect(caps).toEqual([6, 10, 14, 18, 18]);
    for (const cap of caps) {
      expect(cap % BOTTLE_CAPACITY).toBe(2);
    }
  });

  it('每 5 关出现 1 空瓶的高难度关', () => {
    expect(getLevelConfig(10).emptyCount).toBe(1);
    expect(getLevelConfig(11).emptyCount).toBe(2);
  });

  it('关卡号做下界保护', () => {
    expect(getLevelConfig(0).level).toBe(1);
    expect(getLevelConfig(-5).level).toBe(1);
  });

  it('非有限关卡号回退到第 1 关', () => {
    expect(getLevelConfig(Number.NaN).level).toBe(1);
    expect(getLevelConfig(Number.POSITIVE_INFINITY).level).toBe(1);
    expect(getLevelConfig(Number.NEGATIVE_INFINITY).level).toBe(1);
  });
});

describe('容量表', () => {
  it('最后一个瓶子是中央大瓶，其余为普通瓶', () => {
    const config = getLevelConfig(6);
    const caps = buildCapacities(config);
    expect(caps).toHaveLength(filledBottleCount(config) + config.emptyCount + 1);
    expect(caps[tallIndexOf(caps)]).toBe(config.tallCapacity);
    expect(caps.slice(0, -1).every((c) => c === BOTTLE_CAPACITY)).toBe(true);
  });

  it('色块总量 = 普通色 * 4 + 大瓶容量', () => {
    const config = getLevelConfig(9);
    expect(totalUnits(config)).toBe(
      (config.colorCount - 1) * BOTTLE_CAPACITY + config.tallCapacity
    );
  });

  it('capacitiesFor 按实际瓶数给出容量表', () => {
    const { board, caps } = loadLevel(5);
    expect(caps).toHaveLength(board.length);
    expect(caps[caps.length - 1]).toBe(getLevelConfig(5).tallCapacity);
  });
});

describe('generateLevel 关卡生成', () => {
  it('同一关卡可复现（相同牌面）', () => {
    expect(generateLevel(4)).toEqual(generateLevel(4));
  });

  it('色块守恒：普通色各 4 块，大瓶专属色等于大瓶容量', () => {
    const config = getLevelConfig(6);
    const board = generateLevel(6);
    const counts = new Map<number, number>();
    for (const bottle of board) {
      for (const c of bottle) counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    expect(counts.size).toBe(config.colorCount);
    for (const [color, count] of counts) {
      expect(count).toBe(
        color === config.tallColor ? config.tallCapacity : BOTTLE_CAPACITY
      );
    }
  });

  it('专属色数量不是 4 的倍数，因此只能倒进大瓶才能收尾', () => {
    const config = getLevelConfig(7);
    expect(config.tallCapacity % BOTTLE_CAPACITY).not.toBe(0);
  });

  it('不超出各瓶容量，中央大瓶开局为空，且初始未通关', () => {
    const { board, caps } = loadLevel(5);
    board.forEach((bottle, index) => {
      expect(bottle.length).toBeLessThanOrEqual(caps[index]);
    });
    expect(board[board.length - 1]).toEqual([]);
    expect(isSolved(board, caps)).toBe(false);
  });

  it('包含普通空瓶用于中转', () => {
    const board = generateLevel(3);
    // 去掉最后的大瓶后仍应有空瓶
    expect(board.slice(0, -1).filter((b) => b.length === 0).length)
      .toBeGreaterThanOrEqual(1);
  });

  it('前 12 关全部可解，且解法必然把专属色全部倒进大瓶', () => {
    for (let level = 1; level <= 12; level++) {
      const { board, caps } = loadLevel(level);
      const tallIndex = caps.length - 1;
      const result = solve(board, { caps });
      expect(result.solved, `第 ${level} 关应可解`).toBe(true);

      let current = board;
      for (const move of result.moves) {
        const next = pour(current, move.from, move.to, caps);
        expect(next, `第 ${level} 关解法每一步都应合法`).not.toBeNull();
        current = next!.board;
      }
      expect(isSolved(current, caps)).toBe(true);
      expect(current[tallIndex]).toHaveLength(caps[tallIndex]);
      expect(new Set(current[tallIndex])).toEqual(new Set([TALL_COLOR]));
    }
  });
});

describe('buildHiddenMask 未知色分布', () => {
  it('第 1~6 关不藏任何层', () => {
    for (const level of [1, 3, 6]) {
      const board = generateLevel(level);
      expect(hiddenRemaining(buildHiddenMask(board, level))).toBe(0);
    }
  });

  it('中段关卡按配置藏层，且遮罩自洽', () => {
    for (const level of [7, 10, 13, 20]) {
      const board = generateLevel(level);
      const config = getLevelConfig(level);
      const mask = buildHiddenMask(board, level);

      expect(hiddenRemaining(mask)).toBe(config.hiddenCount);
      // 形状一致 + 没有未知层停在液面
      expect(isValidMask(mask, board)).toBe(true);
    }
  });

  it('中央大瓶不参与，且同一瓶最多藏 2 层', () => {
    const level = 20;
    const board = generateLevel(level);
    const mask = buildHiddenMask(board, level);

    expect(mask[board.length - 1].every((cell) => cell === false)).toBe(true);
    for (const row of mask) {
      expect(row.filter(Boolean).length).toBeLessThanOrEqual(2);
    }
  });

  it('同一关卡的遮罩可复现', () => {
    const board = generateLevel(11);
    expect(buildHiddenMask(board, 11)).toEqual(buildHiddenMask(board, 11));
  });

  it('要藏的层数超过可藏位置时不会越界', () => {
    const board = generateLevel(1);
    const mask = buildHiddenMask(board, 1, 999);

    expect(isValidMask(mask, board)).toBe(true);
    expect(hiddenRemaining(mask)).toBeGreaterThan(0);
  });
});

describe('getBottleDecors 装饰分配', () => {
  it('中央大瓶固定挂容量标签，装饰数量与瓶数一致', () => {
    const decors = getBottleDecors(3, 8);
    expect(decors).toHaveLength(8);
    expect(decors[7]).toBe('label');
    expect(decors.slice(0, 7).every((d) => d === 'cork' || d === 'none')).toBe(
      true
    );
  });

  it('同一关卡装饰稳定不变', () => {
    expect(getBottleDecors(4, 9)).toEqual(getBottleDecors(4, 9));
  });
});

describe('generateLevel 缓存', () => {
  it('缓存命中后仍返回相同牌面', () => {
    clearLevelCache();
    const cold = generateLevel(8);
    const warm = generateLevel(8);

    expect(warm).toEqual(cold);
  });

  it('清空缓存后重新生成的牌面保持一致', () => {
    const before = generateLevel(9);
    clearLevelCache();

    expect(generateLevel(9)).toEqual(before);
  });

  it('每次返回独立副本，调用方修改不会污染缓存', () => {
    clearLevelCache();
    const first = generateLevel(6);
    const snapshot = JSON.parse(JSON.stringify(first));

    // 模拟调用方就地改动返回值
    first[0].push(99);
    first.push([99, 99, 99, 99]);

    expect(generateLevel(6)).toEqual(snapshot);
  });

  it('相邻两次调用返回的不是同一个引用', () => {
    clearLevelCache();
    const a = generateLevel(7);
    const b = generateLevel(7);

    expect(b).not.toBe(a);
    expect(b[0]).not.toBe(a[0]);
  });

  it('超出容量上限后仍能正确重建早期关卡', () => {
    clearLevelCache();
    const first = generateLevel(1);
    // 写入远超缓存容量的关卡，迫使第 1 关被淘汰
    for (let level = 2; level <= 40; level++) generateLevel(level);

    expect(generateLevel(1)).toEqual(first);
  });
});

describe('solve 求解器', () => {
  it('已通关牌面立即返回成功且无需移动', () => {
    const board: Board = [[0, 0, 0, 0], [1, 1, 1, 1]];
    const result = solve(board);
    expect(result.solved).toBe(true);
    expect(result.moves).toHaveLength(0);
  });

  it('一步可解的牌面返回单步方案', () => {
    const board: Board = [
      [0, 0, 0],
      [0, 1, 1, 1],
      [1],
    ];
    const result = solve(board);
    expect(result.solved).toBe(true);
    expect(result.moves.length).toBeGreaterThan(0);
  });

  it('满瓶单色也会被倒进大瓶收尾', () => {
    const caps = [4, 4, 6];
    const board: Board = [
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [1, 1],
    ];
    const result = solve(board, { caps });
    expect(result.solved).toBe(true);
    expect(result.moves).toEqual([{ from: 0, to: 2, amount: 4, color: 1 }]);
  });

  it('能看懂大瓶：把 6 层专属色全部灌进大瓶才算解开', () => {
    const caps = [4, 4, 4, 6];
    const board: Board = [
      [1, 0, 1, 1],
      [0, 1, 0, 1],
      [1, 0],
      [],
    ];
    const result = solve(board, { caps });
    expect(result.solved).toBe(true);

    let current = board;
    for (const move of result.moves) {
      const next = pour(current, move.from, move.to, caps);
      expect(next).not.toBeNull();
      current = next!.board;
    }
    expect(isSolved(current, caps)).toBe(true);
    expect(current[3]).toEqual([1, 1, 1, 1, 1, 1]);
  });

  it('死局牌面判定为不可解', () => {
    const stuck: Board = [
      [0, 1, 0, 1],
      [1, 0, 1, 0],
    ];
    expect(isSolvable(stuck)).toBe(false);
  });
});
