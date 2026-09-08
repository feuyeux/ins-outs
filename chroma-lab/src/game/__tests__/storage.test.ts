import { afterEach, describe, expect, it } from 'vitest';
import {
  moveVisibleLayers,
  revealSurfaced,
  withExtraRow,
} from '../hidden';
import { pour, withExtraBottle } from '../logic';
import {
  isBoardCompatibleWithLevel,
  isValidBoard,
  loadProgress,
  normalizeProgress,
  saveProgress,
} from '../storage';
import type { Board, HiddenMask } from '../types';

const KEY = 'chroma-lab:progress:v1';
const LEGACY_KEY = 'magic-sort:progress:v1';

/** 与牌面同形的全可见遮罩 */
function visible(board: Board): HiddenMask {
  return board.map((bottle) => bottle.map(() => false));
}

/**
 * 第 1 / 2 关的合法中局牌面：
 * 3 色（专属色 1 共 6 块）+ 4 个装液瓶 + 2 个空瓶 + 1 个容量 6 的中央大瓶
 */
const LEVEL_ONE_BOARD: Board = [
  [0, 1, 2, 0],
  [1, 2, 0, 1],
  [2, 0, 1, 2],
  [1, 1],
  [],
  [],
  [],
];

/** 第 3 / 4 关的合法中局牌面：4 色 + 5 个装液瓶 + 2 空瓶 + 中央大瓶 */
const LEVEL_FOUR_BOARD: Board = [
  [0, 1, 2, 3],
  [0, 1, 2, 3],
  [0, 1, 2, 3],
  [0, 1, 2, 3],
  [1, 1],
  [],
  [],
  [],
];
const originalWindowDescriptor = Object.getOwnPropertyDescriptor(
  globalThis,
  'window'
);

function installDeniedLocalStorage(): void {
  const browserWindow = {} as Window;
  Object.defineProperty(browserWindow, 'localStorage', {
    configurable: true,
    get() {
      throw new DOMException('Access denied', 'SecurityError');
    },
  });
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: browserWindow,
  });
}

function installMemoryLocalStorage(seed?: string, key: string = KEY): void {
  const store = new Map<string, string>();
  if (seed !== undefined) store.set(key, seed);
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, value: string) => void store.set(k, value),
        removeItem: (k: string) => void store.delete(k),
      },
    },
  });
}

afterEach(() => {
  if (originalWindowDescriptor) {
    Object.defineProperty(globalThis, 'window', originalWindowDescriptor);
  } else {
    Reflect.deleteProperty(globalThis, 'window');
  }
});

describe('storage access failures', () => {
  it('falls back to default progress when localStorage access is denied', () => {
    installDeniedLocalStorage();

    expect(loadProgress()).toEqual({
      level: 1,
      bestLevel: 1,
      board: null,
      hidden: null,
      moveCount: 0,
      rescued: 0,
    });
  });

  it('silently ignores saves when localStorage access is denied', () => {
    installDeniedLocalStorage();

    expect(() =>
      saveProgress({
        level: 2,
        bestLevel: 3,
        board: null,
        hidden: null,
        moveCount: 0,
        rescued: 0,
      })
    ).not.toThrow();
  });

  it('falls back to defaults when stored JSON is corrupted', () => {
    installMemoryLocalStorage('{not json');

    expect(loadProgress().level).toBe(1);
  });
});

describe('legacy save migration', () => {
  it('keeps level progress from the Magic Sort era but re-deals the board', () => {
    installMemoryLocalStorage(
      JSON.stringify({ level: 5, bestLevel: 9, board: [[0], [0]], moveCount: 12 }),
      LEGACY_KEY
    );

    const progress = loadProgress();

    expect(progress.level).toBe(5);
    expect(progress.bestLevel).toBe(9);
    expect(progress.board).toBeNull();
    expect(progress.hidden).toBeNull();
    expect(progress.moveCount).toBe(0);
  });
});

describe('isValidBoard', () => {
  const valid: Board = [[0, 1], [1, 0], [0, 1], [1, 0], []];

  it('accepts a structurally sound board', () => {
    expect(isValidBoard(valid)).toBe(true);
  });

  it('rejects bottles exceeding the default capacity', () => {
    expect(isValidBoard([[0, 0, 0, 0, 0], [0, 0, 0]])).toBe(false);
  });

  it('accepts an over-sized last bottle only when it is the tall one', () => {
    const withTall: Board = [[0, 0], [1, 1, 1, 1, 1, 1]];
    expect(isValidBoard(withTall)).toBe(false);
    expect(isValidBoard(withTall, [4, 6])).toBe(true);
  });

  it('rejects non-integer and negative cells', () => {
    expect(isValidBoard([[0.5, 0, 0, 0], []])).toBe(false);
    expect(isValidBoard([[-1, 0, 0, 0], []])).toBe(false);
  });

  it('rejects malformed or empty structures', () => {
    expect(isValidBoard(null)).toBe(false);
    expect(isValidBoard([])).toBe(false);
    expect(isValidBoard([[], []])).toBe(false);
    expect(isValidBoard(['nope', []])).toBe(false);
  });
});

describe('isBoardCompatibleWithLevel', () => {
  it('accepts a board matching its level configuration', () => {
    expect(isBoardCompatibleWithLevel(LEVEL_ONE_BOARD, 1)).toBe(true);
    expect(isBoardCompatibleWithLevel(LEVEL_FOUR_BOARD, 4)).toBe(true);
  });

  it('accepts one extra empty bottle from the rescue action', () => {
    const rescued = [...LEVEL_ONE_BOARD.slice(0, -1), [], []];
    expect(isBoardCompatibleWithLevel(rescued, 1)).toBe(true);
  });

  it('rejects a board from a different level', () => {
    expect(isBoardCompatibleWithLevel(LEVEL_ONE_BOARD, 4)).toBe(false);
    expect(isBoardCompatibleWithLevel(LEVEL_FOUR_BOARD, 1)).toBe(false);
  });

  it('rejects boards whose colour counts are not conserved', () => {
    // 专属色只剩 4 块，凑不满容量 6 的大瓶，属于被篡改的牌面
    const tampered = LEVEL_ONE_BOARD.map((bottle) => bottle.slice());
    tampered[3] = [];
    expect(isBoardCompatibleWithLevel(tampered, 1)).toBe(false);
  });

  it('rejects legacy saves that have no tall bottle', () => {
    const legacy: Board = [
      [0, 1, 2, 0],
      [1, 2, 0, 1],
      [2, 0, 1, 2],
      [],
      [],
    ];
    expect(isBoardCompatibleWithLevel(legacy, 1)).toBe(false);
  });
});

describe('normalizeProgress', () => {
  it('keeps a level-compatible board, mask and move count', () => {
    const board = LEVEL_FOUR_BOARD;
    const hidden = visible(board);
    const progress = normalizeProgress({
      level: 4,
      bestLevel: 6,
      board,
      hidden,
      moveCount: 7,
      rescued: 1,
    });

    expect(progress).toEqual({
      level: 4,
      bestLevel: 6,
      board,
      hidden,
      moveCount: 7,
      rescued: 1,
    });
  });

  it('keeps a mask that hides layers below the surface', () => {
    const board = LEVEL_FOUR_BOARD;
    const hidden = visible(board);
    hidden[0][1] = true;

    expect(normalizeProgress({ level: 4, board, hidden }).hidden?.[0][1]).toBe(
      true
    );
  });

  it('drops the board when the mask hides a surface layer', () => {
    const board = LEVEL_FOUR_BOARD;
    const hidden = visible(board);
    // 顶层被藏住是不可能通过正常游玩产生的状态
    hidden[0][board[0].length - 1] = true;

    const progress = normalizeProgress({ level: 4, board, hidden });
    expect(progress.board).toBeNull();
    expect(progress.hidden).toBeNull();
  });

  it('drops the board when the mask shape does not match', () => {
    const progress = normalizeProgress({
      level: 4,
      board: LEVEL_FOUR_BOARD,
      hidden: [[false]],
    });
    expect(progress.board).toBeNull();
  });

  it('copies the board instead of aliasing the input', () => {
    const board = LEVEL_FOUR_BOARD;
    const progress = normalizeProgress({
      level: 4,
      bestLevel: 4,
      board,
      hidden: visible(board),
    });

    expect(progress.board).not.toBe(board);
    expect(progress.board?.[0]).not.toBe(board[0]);
  });

  it('drops an invalid board and its move count', () => {
    const progress = normalizeProgress({
      level: 3,
      bestLevel: 3,
      board: [[0, 0, 0]],
      moveCount: 9,
    });

    expect(progress.board).toBeNull();
    expect(progress.moveCount).toBe(0);
  });

  it('repairs out-of-range levels and keeps bestLevel consistent', () => {
    expect(normalizeProgress({ level: -2, bestLevel: 0 }).level).toBe(1);
    expect(normalizeProgress({ level: 9, bestLevel: 2 }).bestLevel).toBe(9);
    expect(normalizeProgress({ level: 3.7, bestLevel: 3.7 }).level).toBe(3);
  });

  it('accepts legacy saves without board fields', () => {
    expect(normalizeProgress({ level: 5, bestLevel: 8 })).toEqual({
      level: 5,
      bestLevel: 8,
      board: null,
      hidden: null,
      moveCount: 0,
      rescued: 0,
    });
  });
});

describe('progress round-trip', () => {
  it('preserves a rescued board, mask row and rescue count after reload', () => {
    installMemoryLocalStorage();
    const insertAt = LEVEL_ONE_BOARD.length - 1;
    const board = withExtraBottle(LEVEL_ONE_BOARD, insertAt);
    const hidden = withExtraRow(visible(LEVEL_ONE_BOARD), insertAt);

    saveProgress({
      level: 1,
      bestLevel: 1,
      board,
      hidden,
      moveCount: 4,
      rescued: 1,
    });

    expect(loadProgress()).toEqual({
      level: 1,
      bestLevel: 1,
      board,
      hidden,
      moveCount: 4,
      rescued: 1,
    });
  });

  it('preserves the board and synchronized mask after a move and reload', () => {
    installMemoryLocalStorage();
    const board = LEVEL_ONE_BOARD;
    const hidden = visible(board);
    const result = pour(board, 3, 6, [4, 4, 4, 4, 4, 4, 6])!;
    const movedMask = moveVisibleLayers(
      hidden,
      result.move.from,
      result.move.to,
      result.move.amount
    );
    const revealed = revealSurfaced(result.board, movedMask);

    saveProgress({
      level: 1,
      bestLevel: 1,
      board: result.board,
      hidden: revealed.mask,
      moveCount: 1,
      rescued: 0,
    });

    expect(loadProgress()).toMatchObject({
      board: result.board,
      hidden: revealed.mask,
      moveCount: 1,
    });
  });

  it('restores an in-level board and mask after a reload', () => {
    installMemoryLocalStorage();
    const board = LEVEL_ONE_BOARD;
    const hidden = visible(board);
    hidden[1][0] = true;

    saveProgress({ level: 2, bestLevel: 5, board, hidden, moveCount: 12, rescued: 0 });

    expect(loadProgress()).toEqual({
      level: 2,
      bestLevel: 5,
      board,
      hidden,
      moveCount: 12,
      rescued: 0,
    });
  });
});
