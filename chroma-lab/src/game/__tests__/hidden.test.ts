import { describe, expect, it } from 'vitest';
import {
  cloneMask,
  emptyMask,
  hiddenRemaining,
  isHidden,
  isValidMask,
  moveVisibleLayers,
  revealSurfaced,
  withExtraRow,
} from '../hidden';
import { pour, withExtraBottle } from '../logic';
import type { Board } from '../types';

describe('moveVisibleLayers 倒液遮罩同步', () => {
  it('同步源与目标行长度，再揭晓刚浮到液面的未知层', () => {
    const board: Board = [[0, 1, 1], [1]];
    const mask = emptyMask(board);
    mask[0][0] = true;

    const result = pour(board, 0, 1)!;
    const moved = moveVisibleLayers(mask, 0, 1, result.move.amount);
    const revealed = revealSurfaced(result.board, moved);

    expect(revealed.revealed).toBe(1);
    expect(revealed.mask.map((row) => row.length)).toEqual([1, 3]);
    expect(revealed.mask).toEqual([[false], [false, false, false]]);
    expect(isValidMask(revealed.mask, result.board)).toBe(true);
    expect(mask.map((row) => row.length)).toEqual([3, 1]);
  });

  it('同色未知层留在源瓶，并在上方可见层倒走后揭晓', () => {
    const board: Board = [[7, 1, 1, 1], [1, 1], []];
    const mask = emptyMask(board);
    mask[0][2] = true;

    const result = pour(board, 0, 1, undefined, mask)!;
    const moved = moveVisibleLayers(mask, 0, 1, result.move.amount);
    const revealed = revealSurfaced(result.board, moved);

    expect(result.move.amount).toBe(1);
    expect(result.board[0]).toEqual([7, 1, 1]);
    expect(revealed.revealed).toBe(1);
    expect(revealed.mask[0]).toEqual([false, false, false]);
    expect(revealed.mask[1]).toEqual([false, false, false]);
    expect(isValidMask(revealed.mask, result.board)).toBe(true);
  });
});

describe('emptyMask / cloneMask', () => {
  it('生成与牌面同形的全可见遮罩', () => {
    const board: Board = [[0, 1], [], [2, 2, 2]];
    const mask = emptyMask(board);

    expect(mask.map((row) => row.length)).toEqual([2, 0, 3]);
    expect(mask.flat().every((cell) => cell === false)).toBe(true);
  });

  it('cloneMask 是深拷贝', () => {
    const mask = emptyMask([[0, 1]]);
    const copy = cloneMask(mask);
    copy[0][0] = true;

    expect(mask[0][0]).toBe(false);
  });
});

describe('isHidden / hiddenRemaining', () => {
  it('越界与缺省一律视为可见', () => {
    const mask = emptyMask([[0, 1]]);
    mask[0][0] = true;

    expect(isHidden(mask, 0, 0)).toBe(true);
    expect(isHidden(mask, 0, 1)).toBe(false);
    expect(isHidden(mask, 9, 0)).toBe(false);
    expect(isHidden(undefined, 0, 0)).toBe(false);
  });

  it('统计仍未揭晓的层数', () => {
    const mask = emptyMask([[0, 1, 2], [3]]);
    mask[0][0] = true;
    mask[1][0] = true;

    expect(hiddenRemaining(mask)).toBe(2);
    expect(hiddenRemaining(undefined)).toBe(0);
  });
});

describe('revealSurfaced', () => {
  it('浮到液面的未知层立即揭晓，更深的层继续隐藏', () => {
    const board: Board = [[0, 1, 2]];
    const mask = emptyMask(board);
    mask[0][0] = true;
    mask[0][1] = true;

    // 倒掉顶层后，第 1 层浮到液面
    const after: Board = [[0, 1]];
    const result = revealSurfaced(after, mask);

    expect(result.revealed).toBe(1);
    expect(result.mask[0][1]).toBe(false);
    expect(result.mask[0][0]).toBe(true);
  });

  it('无变化时原样返回同一个引用，避免无谓重渲染', () => {
    const board: Board = [[0, 1]];
    const mask = emptyMask(board);
    const result = revealSurfaced(board, mask);

    expect(result.revealed).toBe(0);
    expect(result.mask).toBe(mask);
  });

  it('一步倒液可能同时揭晓源瓶与目标瓶之外的层不受影响', () => {
    const board: Board = [[0, 1, 1], [1], [2, 0]];
    const mask = emptyMask(board);
    mask[0][0] = true; // 源瓶底层，倒走两层后浮出
    mask[2][0] = true; // 别的瓶子，不该被影响

    const next = pour(board, 0, 1);
    const result = revealSurfaced(next!.board, mask);

    expect(result.revealed).toBe(1);
    expect(result.mask[0][0]).toBe(false);
    expect(result.mask[2][0]).toBe(true);
  });

  it('空瓶不会误报揭晓', () => {
    const board: Board = [[], [0]];
    const mask = emptyMask(board);

    expect(revealSurfaced(board, mask).revealed).toBe(0);
  });
});

describe('withExtraRow 救援加瓶', () => {
  it('在指定位置插入一行空遮罩，保持与牌面同形', () => {
    const mask = emptyMask([[0, 1], [2]]);
    mask[0][0] = true;
    const next = withExtraRow(mask, 1);

    expect(next.map((row) => row.length)).toEqual([2, 0, 1]);
    expect(next[0][0]).toBe(true);
    // 原遮罩不变
    expect(mask.map((row) => row.length)).toEqual([2, 1]);
  });

  it('插入后遮罩与新牌面仍然自洽', () => {
    const board: Board = [[0, 1, 2], [3, 3]];
    const mask = emptyMask(board);
    mask[0][0] = true;

    const nextBoard = withExtraBottle(board, 1);
    const nextMask = withExtraRow(mask, 1);

    expect(isValidMask(nextMask, nextBoard)).toBe(true);
  });
});

describe('isValidMask', () => {
  const board: Board = [[0, 1, 2], [], [3, 3]];

  it('形状一致且未知层都在液面之下才算合法', () => {
    const mask = emptyMask(board);
    mask[0][0] = true;

    expect(isValidMask(mask, board)).toBe(true);
  });

  it('拒绝形状不符的遮罩', () => {
    expect(isValidMask([[false]], board)).toBe(false);
    expect(isValidMask(emptyMask([[0]]), board)).toBe(false);
    expect(isValidMask(null, board)).toBe(false);
  });

  it('拒绝非布尔值', () => {
    const mask: unknown = [[1, 0, 0], [], [0, 0]];
    expect(isValidMask(mask, board)).toBe(false);
  });

  it('拒绝把顶层藏起来的遮罩（正常游玩不可能产生）', () => {
    const mask = emptyMask(board);
    mask[0][2] = true;

    expect(isValidMask(mask, board)).toBe(false);
  });
});
