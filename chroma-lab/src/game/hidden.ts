import type { Board, HiddenMask } from './types';

/**
 * 未知色（hidden）机制
 *
 * 参考市面上成熟的水排序产品：进入中段关卡后，一部分液体层开局是「未知色」，
 * 玩家必须先把它上面的液体倒走，这一层才会揭晓真实颜色。
 * 它带来的是**信息不完全**下的决策：不能再一眼规划到底，只能边试边改，
 * 因此「撤销」从可选功能变成了核心操作。
 *
 * 实现要点：
 * - 遮罩不改变颜色匹配，但会截断一次可倒出的连续段；未知层揭晓前不能被转移。
 *   牌面数据始终保留完整颜色，求解器仍可用完整信息校验可解性。
 * - 被遮的层永远在液面之下：一旦成为顶层立即揭晓，所以它不会以未知状态被倒走。
 * - 揭晓是单调的（只会从遮住变为可见），撤销不会把已知信息重新藏起来——
 *   玩家已经看到的东西再藏起来只会造成困惑，也无法真正收回信息。
 */

/** 生成与牌面同形的全可见遮罩 */
export function emptyMask(board: Board): HiddenMask {
  return board.map((bottle) => bottle.map(() => false));
}

/** 深拷贝遮罩 */
export function cloneMask(mask: HiddenMask): HiddenMask {
  return mask.map((row) => row.slice());
}

/** 某一层是否未知 */
export function isHidden(
  mask: HiddenMask | undefined,
  bottle: number,
  layer: number
): boolean {
  return mask?.[bottle]?.[layer] === true;
}

/** 仍未揭晓的层数 */
export function hiddenRemaining(mask: HiddenMask | undefined): number {
  if (!mask) return 0;
  let count = 0;
  for (const row of mask) {
    for (const cell of row) if (cell) count++;
  }
  return count;
}

/**
 * 倒液时同步移动遮罩结构。
 * 能被倒走的层都已经可见，因此目标瓶新增的遮罩项恒为 false。
 */
export function moveVisibleLayers(
  mask: HiddenMask,
  from: number,
  to: number,
  amount: number
): HiddenMask {
  const next = cloneMask(mask);
  if (amount <= 0 || from === to) return next;

  next[from].splice(-amount, amount);
  next[to].push(...Array<boolean>(amount).fill(false));
  return next;
}

/**
 * 揭晓所有已经浮到液面的未知层。
 * 只需检查每瓶顶层：更深的层仍被压着，理应继续隐藏。
 * 返回新遮罩与本次揭晓的层数；无变化时原样返回，避免无谓的重渲染。
 */
export function revealSurfaced(
  board: Board,
  mask: HiddenMask
): { mask: HiddenMask; revealed: number } {
  let revealed = 0;
  let next: HiddenMask | null = null;

  for (let b = 0; b < board.length; b++) {
    const top = board[b].length - 1;
    if (top < 0) continue;
    if (mask[b]?.[top] !== true) continue;
    if (!next) next = cloneMask(mask);
    next[b][top] = false;
    revealed++;
  }

  return next ? { mask: next, revealed } : { mask, revealed: 0 };
}

/**
 * 牌面插入空瓶时同步插入一行空遮罩，保持两者同形。
 */
export function withExtraRow(mask: HiddenMask, at: number): HiddenMask {
  const next = cloneMask(mask);
  next.splice(at, 0, []);
  return next;
}

/**
 * 遮罩结构是否与牌面自洽：形状一致、只含布尔值，
 * 且没有任何未知层停留在液面（那种状态无法通过正常游玩产生）。
 */
export function isValidMask(value: unknown, board: Board): value is HiddenMask {
  if (!Array.isArray(value) || value.length !== board.length) return false;
  for (let b = 0; b < board.length; b++) {
    const row = value[b];
    if (!Array.isArray(row) || row.length !== board[b].length) return false;
    for (const cell of row) {
      if (typeof cell !== 'boolean') return false;
    }
    const top = board[b].length - 1;
    if (top >= 0 && row[top] === true) return false;
  }
  return true;
}
