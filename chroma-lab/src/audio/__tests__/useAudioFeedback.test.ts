import { describe, expect, it } from 'vitest';
import {
  audioEffectsForTransition,
  type AudioGameState,
} from '../useAudioFeedback';

const BASE: AudioGameState = {
  level: 7,
  moveCount: 3,
  selected: null,
  rejected: null,
  hiddenLeft: 2,
  solved: false,
  deadlock: false,
};

describe('audioEffectsForTransition', () => {
  it('一次倒液揭晓未知层时叠加倒液与揭晓音效', () => {
    expect(
      audioEffectsForTransition(BASE, {
        ...BASE,
        moveCount: 4,
        hiddenLeft: 1,
      })
    ).toEqual(['pour', 'reveal']);
  });

  it('选择与拒绝分别触发短反馈', () => {
    expect(
      audioEffectsForTransition(BASE, { ...BASE, selected: 2 })
    ).toEqual(['select']);
    expect(
      audioEffectsForTransition(BASE, { ...BASE, rejected: 5 })
    ).toEqual(['reject']);
  });

  it('通关优先于死局，普通死局播放警示音', () => {
    expect(
      audioEffectsForTransition(BASE, {
        ...BASE,
        solved: true,
        deadlock: true,
      })
    ).toEqual(['win']);
    expect(
      audioEffectsForTransition(BASE, { ...BASE, deadlock: true })
    ).toEqual(['deadlock']);
  });

  it('切换关卡重置步数和未知层时不会误播倒液或揭晓', () => {
    expect(
      audioEffectsForTransition(BASE, {
        ...BASE,
        level: 8,
        moveCount: 0,
        hiddenLeft: 0,
      })
    ).toEqual([]);
  });
});
