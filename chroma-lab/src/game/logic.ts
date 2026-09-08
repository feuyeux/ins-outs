import type {
  Board,
  Bottle,
  Capacities,
  ColorId,
  HiddenMask,
  Move,
} from './types';

/** 普通瓶的容量（截图中每瓶为 4 层色块） */
export const BOTTLE_CAPACITY = 4;

/** 取某个瓶子的容量，缺省按普通瓶处理 */
export function capacityAt(caps: Capacities | undefined, index: number): number {
  const value = caps?.[index];
  return typeof value === 'number' && value > 0 ? value : BOTTLE_CAPACITY;
}

/** 深拷贝牌面 */
export function cloneBoard(board: Board): Board {
  return board.map((bottle) => bottle.slice());
}

/** 瓶子最上层颜色，空瓶返回 null */
export function topColor(bottle: Bottle): ColorId | null {
  return bottle.length === 0 ? null : bottle[bottle.length - 1];
}

/** 瓶子顶部可见同色连续段的长度；遇到未知层立即停止 */
export function topRunLength(
  bottle: Bottle,
  hiddenLayers?: readonly boolean[]
): number {
  if (bottle.length === 0) return 0;
  const color = bottle[bottle.length - 1];
  let run = 0;
  for (let i = bottle.length - 1; i >= 0 && bottle[i] === color; i--) {
    if (hiddenLayers?.[i] === true) break;
    run++;
  }
  return run;
}

/** 瓶子剩余空间 */
export function freeSpace(
  bottle: Bottle,
  capacity: number = BOTTLE_CAPACITY
): number {
  return capacity - bottle.length;
}

/** 瓶子是否已装满 */
export function isBottleFull(
  bottle: Bottle,
  capacity: number = BOTTLE_CAPACITY
): boolean {
  return bottle.length >= capacity;
}

/** 瓶子是否已完成：装满且全为同一种颜色 */
export function isBottleComplete(
  bottle: Bottle,
  capacity: number = BOTTLE_CAPACITY
): boolean {
  return bottle.length === capacity && bottle.every((c) => c === bottle[0]);
}

/** 瓶子是否为单色（可以未装满），空瓶视为单色 */
export function isBottleUniform(bottle: Bottle): boolean {
  return bottle.length === 0 || bottle.every((c) => c === bottle[0]);
}

/**
 * 判断能否从 from 倒向 to。
 * 规则（与截图游戏一致）：
 * - 不能倒给自己
 * - 源瓶不能为空
 * - 目标瓶必须有剩余空间
 * - 目标瓶为空，或目标瓶顶部颜色与源瓶顶部颜色相同
 *
 * 另有两条防空转规则，只在「两瓶容量相同」时生效——此时两瓶完全等价，搬运不产生进展：
 * - 单色瓶倒进同容量的空瓶
 * - 已装满的单色瓶（原地即完成态）倒进同容量的瓶子
 * 容量不同则一律放行：既能把液体倒进更大的中央大瓶，也能把倒错的液体从大瓶取回。
 */
export function canPour(
  board: Board,
  from: number,
  to: number,
  caps?: Capacities
): boolean {
  if (from === to) return false;
  const src = board[from];
  const dst = board[to];
  if (!src || !dst) return false;
  if (src.length === 0) return false;

  const srcCap = capacityAt(caps, from);
  const dstCap = capacityAt(caps, to);
  if (freeSpace(dst, dstCap) <= 0) return false;

  const sameCapacity = dstCap === srcCap;
  if (sameCapacity && isBottleUniform(src)) {
    // 同容量的两瓶完全等价，整瓶单色在它们之间搬运不产生任何进展
    if (dst.length === 0) return false;
    if (isBottleFull(src, srcCap)) return false;
  }

  const srcTop = topColor(src);
  const dstTop = topColor(dst);
  return dstTop === null || dstTop === srcTop;
}

/**
 * 执行倒液，返回新牌面与实际发生的移动。
 * 若不合法则返回 null。
 */
export function pour(
  board: Board,
  from: number,
  to: number,
  caps?: Capacities,
  hidden?: HiddenMask
): { board: Board; move: Move } | null {
  if (!canPour(board, from, to, caps)) return null;
  const next = cloneBoard(board);
  const src = next[from];
  const dst = next[to];
  const color = topColor(src) as ColorId;
  const amount = Math.min(
    topRunLength(src, hidden?.[from]),
    freeSpace(dst, capacityAt(caps, to))
  );
  for (let i = 0; i < amount; i++) {
    src.pop();
    dst.push(color);
  }
  return { board: next, move: { from, to, amount, color } };
}

/**
 * 死局救援：在指定位置插入一个空瓶（默认插在中央大瓶之前）。
 * 纯函数，返回新牌面；容量表由调用方按新长度重算。
 */
export function withExtraBottle(
  board: Board,
  at: number = Math.max(0, board.length - 1)
): Board {
  const next = cloneBoard(board);
  next.splice(at, 0, []);
  return next;
}

/** 牌面是否已通关：每个瓶子（含中央大瓶）要么空，要么按自身容量装满同色 */
export function isSolved(board: Board, caps?: Capacities): boolean {
  return board.every(
    (bottle, index) =>
      bottle.length === 0 || isBottleComplete(bottle, capacityAt(caps, index))
  );
}

/** 已完成的瓶子数量，用于进度展示 */
export function completedCount(board: Board, caps?: Capacities): number {
  return board.filter((bottle, index) =>
    isBottleComplete(bottle, capacityAt(caps, index))
  ).length;
}

/**
 * 完成进度 0~1：以「已归位的色块数 / 总色块数」衡量，
 * 比单纯统计满瓶更平滑，用于驱动顶栏进度条。
 */
export function progressRatio(board: Board): number {
  let total = 0;
  let placed = 0;
  for (const bottle of board) {
    total += bottle.length;
    if (isBottleUniform(bottle)) placed += bottle.length;
  }
  return total === 0 ? 0 : placed / total;
}

/** 列出当前所有合法移动 */
export function legalMoves(
  board: Board,
  caps?: Capacities
): Array<{ from: number; to: number }> {
  const moves: Array<{ from: number; to: number }> = [];
  for (let from = 0; from < board.length; from++) {
    for (let to = 0; to < board.length; to++) {
      if (canPour(board, from, to, caps)) moves.push({ from, to });
    }
  }
  return moves;
}

/** 是否已无路可走（且未通关）——死局 */
export function isDeadlock(board: Board, caps?: Capacities): boolean {
  return !isSolved(board, caps) && legalMoves(board, caps).length === 0;
}

/**
 * 牌面规范化 key：「容量 + 瓶内容序列」排序后拼接。
 * 同容量的瓶子彼此等价（位置无关），排序可大幅提升搜索去重率；
 * 容量不同的瓶子（如中央大瓶）不可互换，因此把容量写进 key。
 */
export function boardKey(board: Board, caps?: Capacities): string {
  return board
    .map((bottle, index) => `${capacityAt(caps, index)}:${bottle.join(',')}`)
    .sort()
    .join('|');
}
