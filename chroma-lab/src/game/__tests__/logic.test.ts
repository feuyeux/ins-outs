import { describe, expect, it } from 'vitest';
import {
  BOTTLE_CAPACITY,
  boardKey,
  canPour,
  capacityAt,
  completedCount,
  freeSpace,
  isBottleComplete,
  isBottleFull,
  isDeadlock,
  isSolved,
  legalMoves,
  pour,
  progressRatio,
  topColor,
  topRunLength,
  withExtraBottle,
} from '../logic';
import type { Board, Capacities } from '../types';

/** 两个普通瓶 + 一个容量 6 的中央大瓶 */
const TALL_CAPS: Capacities = [4, 4, 6];

describe('基础访问器', () => {
  it('普通瓶容量为 4，与截图一致', () => {
    expect(BOTTLE_CAPACITY).toBe(4);
  });

  it('capacityAt 缺省回退到普通瓶容量', () => {
    expect(capacityAt(undefined, 0)).toBe(BOTTLE_CAPACITY);
    expect(capacityAt(TALL_CAPS, 2)).toBe(6);
    expect(capacityAt(TALL_CAPS, 9)).toBe(BOTTLE_CAPACITY);
  });

  it('topColor 返回顶层颜色，空瓶返回 null', () => {
    expect(topColor([])).toBeNull();
    expect(topColor([0, 1, 2])).toBe(2);
  });

  it('topRunLength 统计顶部同色连续段', () => {
    expect(topRunLength([])).toBe(0);
    expect(topRunLength([0, 1, 1, 1])).toBe(3);
    expect(topRunLength([1, 1, 1, 0])).toBe(1);
  });

  it('freeSpace / isBottleFull 按传入容量计算', () => {
    expect(freeSpace([1, 1])).toBe(2);
    expect(freeSpace([1, 1], 6)).toBe(4);
    expect(isBottleFull([1, 1, 1, 1])).toBe(true);
    expect(isBottleFull([1, 1, 1, 1], 6)).toBe(false);
  });

  it('isBottleComplete 要求按自身容量装满且同色', () => {
    expect(isBottleComplete([2, 2, 2, 2])).toBe(true);
    expect(isBottleComplete([2, 2, 2])).toBe(false);
    expect(isBottleComplete([2, 2, 2, 3])).toBe(false);
    // 同样 4 层液体，装在容量 6 的大瓶里就还没满
    expect(isBottleComplete([2, 2, 2, 2], 6)).toBe(false);
    expect(isBottleComplete([2, 2, 2, 2, 2, 2], 6)).toBe(true);
  });
});

describe('canPour 倒液规则', () => {
  it('禁止倒给自己', () => {
    const board: Board = [[0, 1], [1]];
    expect(canPour(board, 0, 0)).toBe(false);
  });

  it('空瓶不能作为源', () => {
    const board: Board = [[], [1]];
    expect(canPour(board, 0, 1)).toBe(false);
  });

  it('目标瓶满时不能倒入', () => {
    const board: Board = [[1], [1, 1, 1, 1]];
    expect(canPour(board, 0, 1)).toBe(false);
  });

  it('颜色不同不能倒入', () => {
    const board: Board = [[0], [1]];
    expect(canPour(board, 0, 1)).toBe(false);
  });

  it('顶层同色可以倒入', () => {
    const board: Board = [[0, 1], [1]];
    expect(canPour(board, 0, 1)).toBe(true);
  });

  it('混色瓶可以倒入空瓶', () => {
    const board: Board = [[0, 1], []];
    expect(canPour(board, 0, 1)).toBe(true);
  });

  it('同容量之间：单色瓶倒入空瓶属于无意义搬运，禁止', () => {
    const board: Board = [[1, 1], []];
    expect(canPour(board, 0, 1)).toBe(false);
  });

  it('同容量之间：已完成的瓶子不能再倒出', () => {
    const board: Board = [[1, 1, 1, 1], [1]];
    expect(canPour(board, 0, 1)).toBe(false);
  });
});

describe('canPour 与中央大瓶', () => {
  it('单色瓶可以倒进空的大瓶（容量更大即为进展）', () => {
    const board: Board = [[1, 1], [], []];
    expect(canPour(board, 0, 1, TALL_CAPS)).toBe(false);
    expect(canPour(board, 0, 2, TALL_CAPS)).toBe(true);
  });

  it('满瓶单色仍可倒进大瓶——它在普通瓶里并非完成态', () => {
    const board: Board = [[1, 1, 1, 1], [], [1]];
    expect(canPour(board, 0, 2, TALL_CAPS)).toBe(true);
  });

  it('大瓶未满时可以继续接收，满了就拒绝', () => {
    const board: Board = [[1, 1], [], [1, 1, 1, 1, 1, 1]];
    expect(canPour(board, 0, 2, TALL_CAPS)).toBe(false);
  });

  it('倒错的液体可以从大瓶取回到空瓶（容量不同不算空转）', () => {
    const board: Board = [[], [], [3, 3]];
    expect(canPour(board, 2, 0, TALL_CAPS)).toBe(true);
  });

  it('倒进大瓶一次最多灌满剩余空间', () => {
    const board: Board = [[1, 1, 1, 1], [], [1, 1, 1, 1, 1]];
    const result = pour(board, 0, 2, TALL_CAPS);
    expect(result!.move.amount).toBe(1);
    expect(result!.board[2]).toHaveLength(6);
    expect(result!.board[0]).toEqual([1, 1, 1]);
  });
});

describe('pour 执行倒液', () => {
  it('遇到同色未知层时只倒出其上方可见连续段', () => {
    const board: Board = [[7, 1, 1, 1], [1, 1], []];
    const hidden = [
      [false, false, true, false],
      [false, false],
      [],
    ];

    const result = pour(board, 0, 1, undefined, hidden);

    expect(result!.move.amount).toBe(1);
    expect(result!.board[0]).toEqual([7, 1, 1]);
    expect(result!.board[1]).toEqual([1, 1, 1]);
  });

  it('一次搬运顶部整段同色', () => {
    const board: Board = [[0, 1, 1], [1]];
    const result = pour(board, 0, 1);
    expect(result).not.toBeNull();
    expect(result!.board[0]).toEqual([0]);
    expect(result!.board[1]).toEqual([1, 1, 1]);
    expect(result!.move).toEqual({ from: 0, to: 1, amount: 2, color: 1 });
  });

  it('受目标瓶剩余空间限制', () => {
    const board: Board = [[1, 1, 1], [1, 1, 1]];
    const result = pour(board, 0, 1);
    expect(result!.board[0]).toEqual([1, 1]);
    expect(result!.board[1]).toEqual([1, 1, 1, 1]);
    expect(result!.move.amount).toBe(1);
  });

  it('不修改原牌面（纯函数）', () => {
    const board: Board = [[0, 1], [1]];
    const snapshot = JSON.stringify(board);
    pour(board, 0, 1);
    expect(JSON.stringify(board)).toBe(snapshot);
  });

  it('非法移动返回 null', () => {
    const board: Board = [[0], [1]];
    expect(pour(board, 0, 1)).toBeNull();
  });
});

describe('胜负与进度判定', () => {
  it('全部满瓶单色即通关', () => {
    expect(isSolved([[0, 0, 0, 0], [1, 1, 1, 1], []])).toBe(true);
  });

  it('存在混色瓶则未通关', () => {
    expect(isSolved([[0, 0, 0, 1], [1, 1, 1, 0]])).toBe(false);
  });

  it('半满单色瓶不算通关', () => {
    expect(isSolved([[0, 0, 0], [1, 1, 1, 1]])).toBe(false);
  });

  it('大瓶必须按自身容量装满才算通关', () => {
    const almost: Board = [[0, 0, 0, 0], [], [1, 1, 1, 1, 1]];
    const done: Board = [[0, 0, 0, 0], [], [1, 1, 1, 1, 1, 1]];
    expect(isSolved(almost, TALL_CAPS)).toBe(false);
    expect(isSolved(done, TALL_CAPS)).toBe(true);
  });

  it('completedCount 统计已完成瓶数（含容量差异）', () => {
    expect(completedCount([[0, 0, 0, 0], [1, 1], []])).toBe(1);
    expect(
      completedCount([[0, 0, 0, 0], [], [1, 1, 1, 1]], TALL_CAPS)
    ).toBe(1);
  });

  it('progressRatio 在通关时为 1', () => {
    expect(progressRatio([[0, 0, 0, 0], [1, 1, 1, 1]])).toBe(1);
  });

  it('progressRatio 在完全混乱时小于 1', () => {
    expect(progressRatio([[0, 1, 0, 1], [1, 0, 1, 0]])).toBeLessThan(1);
  });

  it('死局：未通关且无合法移动', () => {
    // 两瓶都满且混色，无空位，无处可倒
    const stuck: Board = [
      [0, 1, 0, 1],
      [1, 0, 1, 0],
    ];
    expect(legalMoves(stuck)).toHaveLength(0);
    expect(isDeadlock(stuck)).toBe(true);
  });

  it('大瓶还有空位时不算死局', () => {
    const board: Board = [
      [0, 1, 0, 1],
      [1, 0, 1, 0],
      [],
    ];
    expect(legalMoves(board, TALL_CAPS).length).toBeGreaterThan(0);
    expect(isDeadlock(board, TALL_CAPS)).toBe(false);
  });

  it('通关状态不算死局', () => {
    expect(isDeadlock([[0, 0, 0, 0], [1, 1, 1, 1]])).toBe(false);
  });
});

describe('withExtraBottle 死局救援', () => {
  it('默认把空瓶插在中央大瓶之前，不动大瓶的位置', () => {
    const board: Board = [[0, 1], [1], [2, 2]];
    const next = withExtraBottle(board);

    expect(next).toEqual([[0, 1], [1], [], [2, 2]]);
    // 大瓶仍是最后一个
    expect(next[next.length - 1]).toEqual([2, 2]);
  });

  it('是纯函数，不修改原牌面', () => {
    const board: Board = [[0, 1], []];
    const snapshot = JSON.stringify(board);
    withExtraBottle(board);

    expect(JSON.stringify(board)).toBe(snapshot);
  });

  it('多出来的空瓶确实解开了原本的死局', () => {
    // 两瓶都满且混色，无处可倒
    const stuck: Board = [
      [0, 1, 0, 1],
      [1, 0, 1, 0],
      [],
    ];
    const caps: Capacities = [4, 4, 4];
    expect(isDeadlock([stuck[0], stuck[1]], [4, 4])).toBe(true);

    const rescued = withExtraBottle([stuck[0], stuck[1]], 2);
    expect(isDeadlock(rescued, caps)).toBe(false);
  });
});

describe('boardKey 规范化', () => {
  it('瓶子顺序不同但内容相同应得到同一 key', () => {
    const a: Board = [[0, 1], [2], []];
    const b: Board = [[2], [], [0, 1]];
    expect(boardKey(a)).toBe(boardKey(b));
  });

  it('内容不同应得到不同 key', () => {
    expect(boardKey([[0, 1]])).not.toBe(boardKey([[1, 0]]));
  });

  it('容量不同的瓶子不可互换，key 必须不同', () => {
    const a: Board = [[1, 1], []];
    const b: Board = [[], [1, 1]];
    // 都是普通瓶时两者等价
    expect(boardKey(a)).toBe(boardKey(b));
    // 第 2 个瓶子变成大瓶后，「液体在小瓶」与「液体在大瓶」是不同局面
    expect(boardKey(a, [4, 6])).not.toBe(boardKey(b, [4, 6]));
  });
});
