import { MAX_COLORS } from './colors';
import { emptyMask } from './hidden';
import { BOTTLE_CAPACITY, cloneBoard, isBottleComplete, isSolved } from './logic';
import { isSolvable } from './solver';
import type {
  Board,
  BottleDecor,
  Capacities,
  ColorId,
  HiddenMask,
  LevelConfig,
} from './types';

/** 中央大瓶的专属色：玫红，总量恒等于大瓶容量 */
export const TALL_COLOR: ColorId = 1;

/** 从第几关开始出现「未知色」层 */
export const HIDDEN_START_LEVEL = 7;

/** 未知色层数上限 */
export const MAX_HIDDEN_LAYERS = 6;

/** mulberry32 —— 轻量确定性随机数发生器，保证同一关卡每次生成一致 */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates 洗牌（原地） */
function shuffle<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * 关卡难度曲线（三个旋钮各管一段体验）：
 * - 颜色数从 3 起步，每 2 关 +1，上限 MAX_COLORS
 * - 中央大瓶每 4 关长高一格「瓶身」（4 层），容量固定为 4n+2
 * - 第 7 关起引入「未知色」层，每 3 关多藏 1 层，上限 6 层
 * - 每 5 关出现一次仅 1 个空瓶的高难度关
 */
export function getLevelConfig(level: number): LevelConfig {
  const clamped = Number.isFinite(level)
    ? Math.max(1, Math.floor(level))
    : 1;
  const colorCount = Math.min(MAX_COLORS, 3 + Math.floor((clamped - 1) / 2));
  // 大瓶身位：1~4 个瓶身高度，再加 2 层的「零头」
  const tallUnits = Math.min(4, 1 + Math.floor((clamped - 1) / 4));
  const tallCapacity = tallUnits * BOTTLE_CAPACITY + 2;
  // 每 5 关出现一次 1 空瓶的高难度关，且颜色数 >= 5 时才启用
  const hardVariant = clamped % 5 === 0 && colorCount >= 5;
  const emptyCount = hardVariant ? 1 : 2;
  // 前 6 关保持完全信息，让玩家先掌握规则；之后逐步引入未知色
  const hiddenCount =
    clamped < HIDDEN_START_LEVEL
      ? 0
      : Math.min(
          MAX_HIDDEN_LAYERS,
          1 + Math.floor((clamped - HIDDEN_START_LEVEL) / 3)
        );
  return {
    level: clamped,
    colorCount,
    emptyCount,
    tallCapacity,
    tallColor: TALL_COLOR,
    hiddenCount,
  };
}

/** 本关色块总量 */
export function totalUnits(config: LevelConfig): number {
  return (config.colorCount - 1) * BOTTLE_CAPACITY + config.tallCapacity;
}

/** 装有液体的普通瓶数量（最后一瓶可能只装了零头） */
export function filledBottleCount(config: LevelConfig): number {
  return Math.ceil(totalUnits(config) / BOTTLE_CAPACITY);
}

/**
 * 逐瓶容量表：前面全是普通瓶，最后一个是中央大瓶。
 * emptyOverride 供生成兜底时多给一个空瓶使用。
 */
export function buildCapacities(
  config: LevelConfig,
  emptyCount: number = config.emptyCount
): number[] {
  const normalCount = filledBottleCount(config) + emptyCount;
  const caps = new Array<number>(normalCount).fill(BOTTLE_CAPACITY);
  caps.push(config.tallCapacity);
  return caps;
}

/** 中央大瓶在牌面中的下标（约定为最后一个） */
export function tallIndexOf(caps: Capacities): number {
  return caps.length - 1;
}

/**
 * 按配置构造一个随机牌面（不校验可解性）。
 * 专属色的总量等于大瓶容量（4n+2），因此它在普通瓶里永远凑不齐满瓶，
 * 唯一的通关方式是把它整段整段倒进中央大瓶。
 */
function dealBoard(
  config: LevelConfig,
  emptyCount: number,
  rng: () => number
): Board {
  const units: ColorId[] = [];
  for (let color = 0; color < config.colorCount; color++) {
    const amount =
      color === config.tallColor ? config.tallCapacity : BOTTLE_CAPACITY;
    for (let i = 0; i < amount; i++) units.push(color);
  }
  shuffle(units, rng);

  const board: Board = [];
  const filled = filledBottleCount(config);
  for (let i = 0; i < filled; i++) {
    board.push(units.slice(i * BOTTLE_CAPACITY, (i + 1) * BOTTLE_CAPACITY));
  }
  // 空的普通中转瓶
  for (let i = 0; i < emptyCount; i++) board.push([]);
  // 中央大瓶，开局为空
  board.push([]);
  return board;
}

/** 牌面是否「一发牌就已通关」或存在整瓶单色，过于简单需重摇 */
function isTooEasy(board: Board, caps: Capacities): boolean {
  if (isSolved(board, caps)) return true;
  return board.some((bottle, index) => isBottleComplete(bottle, caps[index]));
}

/**
 * 生成关卡：随机发牌 + 求解器校验可解，不可解则换种子重摇。
 * 同一 level 输入始终得到同一牌面（seed 由 level 派生）。
 */
function buildLevel(level: number): Board {
  const config = getLevelConfig(level);
  const maxAttempts = 60;

  for (const emptyCount of [config.emptyCount, config.emptyCount + 1]) {
    const caps = buildCapacities(config, emptyCount);
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // 种子由关卡号、空瓶数与尝试次数派生，保证可复现
      const seed = level * 7919 + attempt * 104729 + emptyCount * 6151 + 1;
      const rng = createRng(seed);
      const board = dealBoard(config, emptyCount, rng);
      if (isTooEasy(board, caps)) continue;
      if (isSolvable(board, 120_000, caps)) return board;
    }
  }

  // 理论上不可达；返回一个宽松配置下的牌面，保证一定有东西可玩
  return dealBoard(config, config.emptyCount + 2, createRng(level + 13));
}

/**
 * 关卡牌面缓存。
 * 关卡完全由 level 决定，因此重玩、来回切关都可以复用首次生成结果，
 * 省掉一次发牌 + 求解器校验（低端机上这步可达数百毫秒，会造成明显卡顿）。
 * 读写都做深拷贝，调用方无法污染缓存；容量有上限，避免长时间游玩后无限增长。
 */
const MAX_CACHED_LEVELS = 32;
const levelCache = new Map<number, Board>();

/** 清空关卡缓存（测试与内存压力场景使用） */
export function clearLevelCache(): void {
  levelCache.clear();
}

export function generateLevel(level: number): Board {
  const cached = levelCache.get(level);
  if (cached) return cloneBoard(cached);

  const board = buildLevel(level);

  if (levelCache.size >= MAX_CACHED_LEVELS) {
    // Map 保持插入顺序，淘汰最早写入的关卡
    const oldest = levelCache.keys().next();
    if (!oldest.done) levelCache.delete(oldest.value);
  }
  levelCache.set(level, cloneBoard(board));

  return board;
}

/**
 * 牌面对应的逐瓶容量表。
 * 关卡内瓶数可能因生成兜底多一个空瓶，因此以实际牌面长度为准。
 */
export function capacitiesFor(level: number, bottleCount: number): number[] {
  const config = getLevelConfig(level);
  const caps = new Array<number>(Math.max(1, bottleCount - 1)).fill(
    BOTTLE_CAPACITY
  );
  caps.push(config.tallCapacity);
  return caps;
}

/**
 * 未知色遮罩：从「液面以下」的层里确定性地挑若干层藏起来。
 *
 * 三条约束保证它只增加推理难度、不产生不可玩的局面：
 * - 只藏液面之下的层（顶层若被藏住，开局就会立刻揭晓，等于没藏）
 * - 同一瓶最多藏 2 层，避免信息过度集中在一瓶里
 * - 中央大瓶开局为空，天然不参与
 */
export function buildHiddenMask(
  board: Board,
  level: number,
  hiddenCount: number = getLevelConfig(level).hiddenCount
): HiddenMask {
  const mask = emptyMask(board);
  if (hiddenCount <= 0) return mask;

  const candidates: Array<[number, number]> = [];
  const tallIndex = board.length - 1;
  for (let b = 0; b < tallIndex; b++) {
    // 顶层（board[b].length - 1）必须保持可见
    for (let i = 0; i < board[b].length - 1; i++) candidates.push([b, i]);
  }

  const rng = createRng(level * 40503 + board.length * 97 + 11);
  shuffle(candidates, rng);

  const perBottle = new Map<number, number>();
  let placed = 0;
  for (const [b, i] of candidates) {
    if (placed >= hiddenCount) break;
    const used = perBottle.get(b) ?? 0;
    if (used >= 2) continue;
    mask[b][i] = true;
    perBottle.set(b, used + 1);
    placed++;
  }
  return mask;
}

/**
 * 瓶子装饰分配 —— 零星出现的木塞，纯视觉，不影响玩法。
 * 由关卡号确定，保证渲染稳定不闪烁；中央大瓶固定挂吊牌。
 */
export function getBottleDecors(level: number, bottleCount: number): BottleDecor[] {
  const rng = createRng(level * 2654435761 + bottleCount);
  const decors: BottleDecor[] = [];
  const normalCount = Math.max(0, bottleCount - 1);
  for (let i = 0; i < normalCount; i++) {
    decors.push(rng() > 0.8 ? 'cork' : 'none');
  }
  decors.push('label');
  return decors;
}
