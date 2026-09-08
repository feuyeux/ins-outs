import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  prefersReducedMotion,
  restoreSnapshot,
  type Snapshot,
} from '../useGame';

const originalWindowDescriptor = Object.getOwnPropertyDescriptor(
  globalThis,
  'window'
);

function installMatchMedia(matches: boolean): ReturnType<typeof vi.fn> {
  const matchMedia = vi.fn().mockReturnValue({ matches });
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { matchMedia },
  });
  return matchMedia;
}

afterEach(() => {
  if (originalWindowDescriptor) {
    Object.defineProperty(globalThis, 'window', originalWindowDescriptor);
  } else {
    Reflect.deleteProperty(globalThis, 'window');
  }
});

describe('restoreSnapshot', () => {
  it('撤销救援时恢复牌面、遮罩形状、步数与救援次数', () => {
    const snapshot: Snapshot = {
      kind: 'rescue',
      insertAt: 1,
      board: [[0, 1], [2, 2]],
      hidden: [[true, false], [false, false]],
      moveCount: 4,
      rescued: 0,
    };
    const currentHidden = [
      [false, false],
      [],
      [false, false],
    ];

    expect(restoreSnapshot(snapshot, currentHidden)).toEqual({
      board: snapshot.board,
      hidden: [[false, false], [false, false]],
      moveCount: 4,
      rescued: 0,
    });
  });

  it('撤销倒液恢复遮罩结构，但不会重新隐藏已经揭晓的层', () => {
    const snapshot: Snapshot = {
      kind: 'pour',
      board: [[0, 1], [1]],
      hidden: [[true, false], [false]],
      moveCount: 2,
      rescued: 1,
    };
    const currentHidden = [[false], [false, false]];

    expect(restoreSnapshot(snapshot, currentHidden).hidden).toEqual([
      [false, false],
      [false],
    ]);
  });
});

describe('prefersReducedMotion', () => {
  it('detects the reduced-motion media preference', () => {
    const matchMedia = installMatchMedia(true);

    expect(prefersReducedMotion()).toBe(true);
    expect(matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
  });

  it('returns false when matchMedia is unavailable', () => {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {},
    });

    expect(prefersReducedMotion()).toBe(false);
  });
});
