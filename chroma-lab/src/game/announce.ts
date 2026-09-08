import { getColor } from './colors';
import type { Move } from './types';

/**
 * 瓶子序号转为可读文案（对外从 1 开始计数）。
 * 中央大瓶不参与编号，单独称呼，避免玩家把它当成普通瓶。
 */
export function bottleLabel(index: number, tallIndex?: number): string {
  return index === tallIndex ? '中央大瓶' : `第 ${index + 1} 个瓶子`;
}

/** 播报一次成功的倒液，附带本次揭晓的未知层数 */
export function describeMove(
  move: Move,
  tallIndex?: number,
  revealed = 0
): string {
  const color = getColor(move.color).label;
  const base = `${bottleLabel(move.from, tallIndex)}的 ${
    move.amount
  } 层${color}倒入${bottleLabel(move.to, tallIndex)}`;
  return revealed > 0 ? `${base}，揭晓 ${revealed} 层未知色` : base;
}

/** 播报提示结果；无解时明确告知，避免点击提示后毫无反馈 */
export function describeHint(move: Move | null, tallIndex?: number): string {
  if (!move) return '当前局面暂无可用提示，可以撤销一步或重玩本关';
  return `提示：把${bottleLabel(move.from, tallIndex)}倒入${bottleLabel(
    move.to,
    tallIndex
  )}`;
}

/** 播报当前关卡状态；无特殊状态时返回空字符串 */
export function describeStatus(params: {
  level: number;
  moveCount: number;
  solved: boolean;
  deadlock: boolean;
}): string {
  if (params.solved) {
    return `第 ${params.level} 关完成，共用 ${params.moveCount} 步`;
  }
  if (params.deadlock) {
    return '已无可行的倒液操作，请撤销一步或重玩本关';
  }
  return '';
}

/** 播报关卡载入 */
export function describeLevelStart(
  level: number,
  tallCapacity?: number,
  hiddenCount = 0
): string {
  const parts = [`进入第 ${level} 关`];
  if (typeof tallCapacity === 'number') {
    parts.push(`中央大瓶可装 ${tallCapacity} 层`);
  }
  if (hiddenCount > 0) {
    parts.push(`有 ${hiddenCount} 层未知色，倒空上层液体后才会揭晓`);
  }
  return parts.join('，');
}
