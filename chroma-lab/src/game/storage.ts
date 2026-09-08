import { isValidMask } from './hidden';
import {
  buildCapacities,
  capacitiesFor,
  getLevelConfig,
} from './levelGenerator';
import { BOTTLE_CAPACITY, capacityAt } from './logic';
import type { Board, Capacities, HiddenMask } from './types';

/** 当前存档键。应用更名为 Chroma Lab，同时牌面结构带上了未知色遮罩 */
const STORAGE_KEY = 'chroma-lab:progress:v1';

/**
 * 历史存档键（Magic Sort 时期）。
 * 只用来迁移关卡与最高进度——旧牌面结构已经不兼容，会被校验挡下后重新发牌。
 */
const LEGACY_KEYS = ['magic-sort:progress:v1'];

/** 每关最多允许的救援加瓶次数，用于校验存档里的瓶数上界 */
const MAX_RESCUE_BOTTLES = 1;

export interface SavedProgress {
  /** 当前所在关卡 */
  level: number;
  /** 历史最高到达关卡 */
  bestLevel: number;
  /** 当前关卡未完成的牌面，缺失表示需要重新生成 */
  board: Board | null;
  /** 未知色遮罩，与 board 同形；board 为空时无意义 */
  hidden: HiddenMask | null;
  /** 当前关卡已用步数 */
  moveCount: number;
  /** 本关已用掉的救援加瓶次数 */
  rescued: number;
}

const DEFAULT_PROGRESS: SavedProgress = {
  level: 1,
  bestLevel: 1,
  board: null,
  hidden: null,
  moveCount: 0,
  rescued: 0,
};

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function isNonNegativeInteger(value: unknown): boolean {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

/**
 * 校验存档牌面的基本结构，避免把损坏或被手工篡改的数据当作可玩局面：
 * - 至少两个瓶子
 * - 每瓶不超过自身容量（缺省按普通瓶 4 层，最后一个可以是中央大瓶）
 * - 色块必须是非负整数
 *
 * 色块守恒与关卡匹配由 isBoardCompatibleWithLevel 负责（需要关卡配置才能判断）。
 */
export function isValidBoard(value: unknown, caps?: Capacities): value is Board {
  if (!Array.isArray(value) || value.length < 2) return false;

  let cells = 0;
  for (let i = 0; i < value.length; i++) {
    const bottle = value[i];
    if (!Array.isArray(bottle)) return false;
    if (bottle.length > capacityAt(caps, i)) return false;
    for (const cell of bottle) {
      if (!isNonNegativeInteger(cell)) return false;
      cells++;
    }
  }

  return cells > 0;
}

/**
 * 校验牌面与存档关卡是否匹配。
 * 除了结构合法，还要求：
 * - 瓶数等于「装液瓶 + 空瓶 + 1 个中央大瓶」，允许生成兜底与救援各多给 1 个空瓶
 * - 颜色恰好是 0..colorCount-1
 * - 普通色各 4 块，大瓶专属色为大瓶容量（色块守恒）
 */
export function isBoardCompatibleWithLevel(
  board: unknown,
  level: number
): board is Board {
  if (!Array.isArray(board)) return false;

  const config = getLevelConfig(level);
  const expected = buildCapacities(config).length;
  const maxBottles = expected + 1 + MAX_RESCUE_BOTTLES;
  if (board.length < expected || board.length > maxBottles) return false;

  const caps = capacitiesFor(level, board.length);
  if (!isValidBoard(board, caps)) return false;

  const counts = new Map<number, number>();
  for (const bottle of board) {
    for (const cell of bottle) counts.set(cell, (counts.get(cell) ?? 0) + 1);
  }
  if (counts.size !== config.colorCount) return false;
  for (let color = 0; color < config.colorCount; color++) {
    const expectedCount =
      color === config.tallColor ? config.tallCapacity : BOTTLE_CAPACITY;
    if (counts.get(color) !== expectedCount) return false;
  }
  return true;
}

/** 把任意存档输入规整为可信的进度对象，非法字段一律回退默认值 */
export function normalizeProgress(value: unknown): SavedProgress {
  if (typeof value !== 'object' || value === null) {
    return { ...DEFAULT_PROGRESS };
  }
  const raw = value as Record<string, unknown>;

  const level = Number.isFinite(raw.level)
    ? Math.max(1, Math.floor(Number(raw.level)))
    : 1;
  const bestLevel = Number.isFinite(raw.bestLevel)
    ? Math.max(1, Math.floor(Number(raw.bestLevel)))
    : level;
  const board = isBoardCompatibleWithLevel(raw.board, level)
    ? raw.board.map((bottle) => bottle.slice())
    : null;
  // 遮罩必须与牌面同形；不自洽就整局重发，避免出现「永远揭不开的层」
  const hidden =
    board && isValidMask(raw.hidden, board)
      ? raw.hidden.map((row) => row.slice())
      : null;
  const usable = board && hidden ? board : null;
  const moveCount =
    usable && Number.isFinite(raw.moveCount)
      ? Math.max(0, Math.floor(Number(raw.moveCount)))
      : 0;
  const rescued =
    usable && Number.isFinite(raw.rescued)
      ? Math.min(MAX_RESCUE_BOTTLES, Math.max(0, Math.floor(Number(raw.rescued))))
      : 0;

  return {
    level,
    bestLevel: Math.max(level, bestLevel),
    board: usable,
    hidden: usable ? hidden : null,
    moveCount,
    rescued,
  };
}

function readKey(key: string): unknown {
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  return JSON.parse(raw);
}

export function loadProgress(): SavedProgress {
  if (!isBrowser()) return { ...DEFAULT_PROGRESS };
  try {
    const current = readKey(STORAGE_KEY);
    if (current !== null) return normalizeProgress(current);

    // 迁移老版本存档：只保留关卡与最高进度，牌面重新发
    for (const key of LEGACY_KEYS) {
      const legacy = readKey(key);
      if (legacy === null) continue;
      const migrated = normalizeProgress(legacy);
      return { ...migrated, board: null, hidden: null, moveCount: 0, rescued: 0 };
    }
    return { ...DEFAULT_PROGRESS };
  } catch {
    // 存档损坏时回退到默认值，不阻断游戏
    return { ...DEFAULT_PROGRESS };
  }
}

export function saveProgress(progress: SavedProgress): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // 隐私模式等场景下写入可能失败，静默忽略
  }
}
