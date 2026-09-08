import { clampVolume, type AudioLevels } from './audioEngine';

export const AUDIO_SETTINGS_KEY = 'chroma-lab:audio:v1';

export interface AudioSettings {
  musicVolume: number;
  effectsVolume: number;
  musicMuted: boolean;
  effectsMuted: boolean;
}

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  musicVolume: 0.28,
  effectsVolume: 0.72,
  musicMuted: false,
  effectsMuted: false,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizeAudioSettings(value: unknown): AudioSettings {
  if (!isRecord(value)) return { ...DEFAULT_AUDIO_SETTINGS };

  return {
    musicVolume:
      typeof value.musicVolume === 'number'
        ? clampVolume(value.musicVolume)
        : DEFAULT_AUDIO_SETTINGS.musicVolume,
    effectsVolume:
      typeof value.effectsVolume === 'number'
        ? clampVolume(value.effectsVolume)
        : DEFAULT_AUDIO_SETTINGS.effectsVolume,
    musicMuted:
      typeof value.musicMuted === 'boolean'
        ? value.musicMuted
        : DEFAULT_AUDIO_SETTINGS.musicMuted,
    effectsMuted:
      typeof value.effectsMuted === 'boolean'
        ? value.effectsMuted
        : DEFAULT_AUDIO_SETTINGS.effectsMuted,
  };
}

export function effectiveAudioLevels(settings: AudioSettings): AudioLevels {
  return {
    music: settings.musicMuted ? 0 : clampVolume(settings.musicVolume),
    effects: settings.effectsMuted ? 0 : clampVolume(settings.effectsVolume),
  };
}

export function loadAudioSettings(): AudioSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_AUDIO_SETTINGS };
  try {
    const raw = window.localStorage.getItem(AUDIO_SETTINGS_KEY);
    return raw === null
      ? { ...DEFAULT_AUDIO_SETTINGS }
      : normalizeAudioSettings(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_AUDIO_SETTINGS };
  }
}

export function saveAudioSettings(settings: AudioSettings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      AUDIO_SETTINGS_KEY,
      JSON.stringify(normalizeAudioSettings(settings))
    );
  } catch {
    // 隐私模式或存储配额不足时保持内存设置，不中断游戏。
  }
}
