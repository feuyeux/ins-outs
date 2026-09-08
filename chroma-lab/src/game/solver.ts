import {
  boardKey,
  canPour,
  capacityAt,
  freeSpace,
  isSolved,
  pour,
  topRunLength,
} from './logic';
import type { Board, Capacities, Move } from './types';

export interface SolveResult {
  solved: boolean;
  moves: Move[];
  /** 搜索访问的节点数，用于诊断 */
  visited: number;
  /** 是否因超出预算而提前放弃 */
  exhausted: boolean;
}

interface Candidate {
  from: number;
  to: number;
  score: number;
}

/**
 * 对候选移动打分，好的走法优先搜索，能显著减少回溯。
 * 分数越高越优先：
 * +100 这一步直接让目标瓶按自身容量装满同色
 * +40  倒入非空同色瓶（合并，减少碎片）
 * +25  倒进容量更大的瓶子（中央大瓶是唯一的归位点，优先喂它）
 * +20  整段搬空源瓶（源瓶变空，腾出中转位）
 * -30  倒入空瓶（消耗宝贵的空位）
 */
function scoreMove(
  board: Board,
  from: number,
  to: number,
  caps?: Capacities
): number {
  const src = board[from];
  const dst = board[to];
  const srcCap = capacityAt(caps, from);
  const dstCap = capacityAt(caps, to);
  const run = topRunLength(src);
  const space = freeSpace(dst, dstCap);
  const amount = Math.min(run, space);
  let score = 0;

  if (dst.length === 0) {
    score -= 30;
  } else {
    // canPour 已保证此处 dst 顶部颜色与 src 顶部颜色相同
    score += 40;
  }

  if (dst.length + amount === dstCap) {
    score += 100;
  }
  if (dstCap > srcCap) {
    score += 25;
  }

  if (run === src.length && amount === run) {
    // 源瓶被完全倒空
    score += 20;
  }
  // 倾向于一次搬运更多色块
  score += amount * 3;
  return score;
}

function orderedCandidates(board: Board, caps?: Capacities): Candidate[] {
  const list: Candidate[] = [];
  for (let from = 0; from < board.length; from++) {
    if (board[from].length === 0) continue;
    for (let to = 0; to < board.length; to++) {
      if (!canPour(board, from, to, caps)) continue;
      list.push({ from, to, score: scoreMove(board, from, to, caps) });
    }
  }
  return list.sort((a, b) => b.score - a.score);
}

/**
 * 深度优先搜索求解，带规范化去重与节点预算。
 * 既用于关卡生成时校验可解性，也用于游戏内提示功能。
 */
export function solve(
  board: Board,
  options: { maxNodes?: number; maxDepth?: number; caps?: Capacities } = {}
): SolveResult {
  const maxNodes = options.maxNodes ?? 200_000;
  const maxDepth = options.maxDepth ?? 220;
  const caps = options.caps;
  const visited = new Set<string>();
  const path: Move[] = [];
  let nodes = 0;
  let exhausted = false;

  function dfs(current: Board, depth: number): boolean {
    if (isSolved(current, caps)) return true;
    if (depth >= maxDepth) return false;
    if (nodes >= maxNodes) {
      exhausted = true;
      return false;
    }
    nodes++;

    const key = boardKey(current, caps);
    if (visited.has(key)) return false;
    visited.add(key);

    for (const cand of orderedCandidates(current, caps)) {
      const result = pour(current, cand.from, cand.to, caps);
      if (!result) continue;
      path.push(result.move);
      if (dfs(result.board, depth + 1)) return true;
      path.pop();
      if (nodes >= maxNodes) {
        exhausted = true;
        return false;
      }
    }
    return false;
  }

  const solved = dfs(board, 0);
  return { solved, moves: solved ? path.slice() : [], visited: nodes, exhausted };
}

/** 判断牌面是否可解 */
export function isSolvable(
  board: Board,
  maxNodes = 120_000,
  caps?: Capacities
): boolean {
  return solve(board, { maxNodes, caps }).solved;
}

/** 求出当前局面的下一步最优提示 */
export function hint(board: Board, caps?: Capacities): Move | null {
  const result = solve(board, { maxNodes: 150_000, caps });
  return result.solved && result.moves.length > 0 ? result.moves[0] : null;
}
