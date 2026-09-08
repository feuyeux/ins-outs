import { useCallback, useEffect, useRef } from 'react';
import {
  AudioEngine,
  type AudioLevels,
  type SoundEffect,
} from './audioEngine';

export interface AudioGameState {
  level: number;
  moveCount: number;
  selected: number | null;
  rejected: number | null;
  hiddenLeft: number;
  solved: boolean;
  deadlock: boolean;
}


export function audioEffectsForTransition(
  previous: AudioGameState,
  current: AudioGameState
): SoundEffect[] {
  const effects: SoundEffect[] = [];
  const sameLevel = previous.level === current.level;
  if (sameLevel && current.moveCount > previous.moveCount) effects.push('pour');
  if (sameLevel && current.hiddenLeft < previous.hiddenLeft) effects.push('reveal');
  if (current.selected !== null && current.selected !== previous.selected) {
    effects.push('select');
  }
  if (current.rejected !== null && current.rejected !== previous.rejected) {
    effects.push('reject');
  }
  if (current.solved && !previous.solved) effects.push('win');
  if (current.deadlock && !previous.deadlock && !current.solved) {
    effects.push('deadlock');
  }
  return effects;
}
export interface AudioFeedback {
  unlock: () => Promise<boolean>;
  play: (effect: SoundEffect) => void;
}

/**
 * 把游戏状态边沿转换为声音反馈。首次渲染只建立基线，不播报存档状态；
 * 后续倒液、拒绝、揭晓、通关与死局变化才触发对应音效。
 */
export function useAudioFeedback(
  game: AudioGameState,
  levels: AudioLevels
): AudioFeedback {
  const engineRef = useRef<AudioEngine | null>(null);
  const previousRef = useRef<AudioGameState | null>(null);

  const ensureEngine = useCallback(() => {
    if (!engineRef.current) engineRef.current = new AudioEngine();
    return engineRef.current;
  }, []);

  const unlock = useCallback(() => ensureEngine().unlock(), [ensureEngine]);

  const play = useCallback(
    (effect: SoundEffect) => {
      const engine = ensureEngine();
      void engine.unlock().then((ready) => {
        if (ready) engine.play(effect);
      });
    },
    [ensureEngine]
  );

  useEffect(() => {
    const engine = ensureEngine();
    return () => {
      engine.dispose();
      if (engineRef.current === engine) engineRef.current = null;
    };
  }, [ensureEngine]);

  useEffect(() => {
    ensureEngine().setLevels(levels);
  }, [ensureEngine, levels.music, levels.effects]);

  useEffect(() => {
    const onFirstGesture = () => void unlock();
    window.addEventListener('pointerdown', onFirstGesture, { once: true });
    window.addEventListener('keydown', onFirstGesture, { once: true });
    return () => {
      window.removeEventListener('pointerdown', onFirstGesture);
      window.removeEventListener('keydown', onFirstGesture);
    };
  }, [unlock]);

  useEffect(() => {
    const previous = previousRef.current;
    previousRef.current = game;
    if (!previous) return;

    for (const effect of audioEffectsForTransition(previous, game)) {
      play(effect);
    }
  }, [game, play]);

  return { unlock, play };
}
