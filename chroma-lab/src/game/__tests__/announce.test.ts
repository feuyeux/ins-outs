import { describe, expect, it } from 'vitest';
import {
  describeHint,
  describeLevelStart,
  describeMove,
  describeStatus,
} from '../announce';
import { getColor } from '../colors';

describe('describeMove', () => {
  it('reports source, target, amount and colour in human terms', () => {
    const text = describeMove({ from: 0, to: 2, amount: 2, color: 1 });

    expect(text).toContain('第 1 个瓶子');
    expect(text).toContain('第 3 个瓶子');
    expect(text).toContain('2 层');
    expect(text).toContain(getColor(1).label);
  });

  it('calls the tall bottle by name instead of numbering it', () => {
    const text = describeMove({ from: 0, to: 6, amount: 3, color: 1 }, 6);

    expect(text).toContain('第 1 个瓶子');
    expect(text).toContain('中央大瓶');
    expect(text).not.toContain('第 7 个瓶子');
  });

  it('announces how many unknown layers the move revealed', () => {
    const text = describeMove({ from: 0, to: 2, amount: 2, color: 1 }, 6, 2);

    expect(text).toContain('揭晓 2 层未知色');
  });

  it('stays quiet about reveals when nothing was revealed', () => {
    const text = describeMove({ from: 0, to: 2, amount: 2, color: 1 }, 6, 0);

    expect(text).not.toContain('未知色');
  });
});

describe('describeHint', () => {
  it('announces the suggested move', () => {
    const text = describeHint({ from: 1, to: 4, amount: 1, color: 0 });

    expect(text).toContain('提示');
    expect(text).toContain('第 2 个瓶子');
    expect(text).toContain('第 5 个瓶子');
  });

  it('explains when no hint exists instead of staying silent', () => {
    expect(describeHint(null)).toContain('暂无可用提示');
  });

  it('names the tall bottle in hints', () => {
    expect(describeHint({ from: 2, to: 8, amount: 2, color: 1 }, 8)).toContain(
      '中央大瓶'
    );
  });
});

describe('describeStatus', () => {
  it('announces a win with the move count', () => {
    const text = describeStatus({
      level: 3,
      moveCount: 11,
      solved: true,
      deadlock: false,
    });

    expect(text).toContain('第 3 关完成');
    expect(text).toContain('11 步');
  });

  it('announces a deadlock', () => {
    const text = describeStatus({
      level: 3,
      moveCount: 5,
      solved: false,
      deadlock: true,
    });

    expect(text).toContain('无可行的倒液操作');
  });

  it('prefers the win message when both flags are set', () => {
    const text = describeStatus({
      level: 2,
      moveCount: 4,
      solved: true,
      deadlock: true,
    });

    expect(text).toContain('完成');
  });

  it('returns an empty string during normal play', () => {
    expect(
      describeStatus({ level: 1, moveCount: 0, solved: false, deadlock: false })
    ).toBe('');
  });
});

describe('describeLevelStart', () => {
  it('announces the entered level', () => {
    expect(describeLevelStart(7)).toContain('第 7 关');
  });

  it('announces the tall bottle capacity when known', () => {
    const text = describeLevelStart(7, 14);
    expect(text).toContain('第 7 关');
    expect(text).toContain('中央大瓶可装 14 层');
  });

  it('warns about unknown layers when the level has them', () => {
    const text = describeLevelStart(9, 14, 2);
    expect(text).toContain('2 层未知色');
    expect(describeLevelStart(3, 6, 0)).not.toContain('未知色');
  });
});
