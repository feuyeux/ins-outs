import { afterEach, describe, expect, it } from 'vitest';
import {
  AUDIO_SETTINGS_KEY,
  DEFAULT_AUDIO_SETTINGS,
  effectiveAudioLevels,
  loadAudioSettings,
  normalizeAudioSettings,
  saveAudioSettings,
} from '../audioSettings';

const originalWindowDescriptor = Object.getOwnPropertyDescriptor(
  globalThis,
  'window'
);

function installMemoryStorage(seed?: string): Map<string, string> {
  const store = new Map<string, string>();
  if (seed !== undefined) store.set(AUDIO_SETTINGS_KEY, seed);
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => void store.set(key, value),
      },
    },
  });
  return store;
}

afterEach(() => {
  if (originalWindowDescriptor) {
    Object.defineProperty(globalThis, 'window', originalWindowDescriptor);
  } else {
    Reflect.deleteProperty(globalThis, 'window');
  }
});

describe('normalizeAudioSettings', () => {
  it('缺失或损坏数据回退到默认值', () => {
    expect(normalizeAudioSettings(null)).toEqual(DEFAULT_AUDIO_SETTINGS);
    expect(normalizeAudioSettings({ musicMuted: 'no' })).toEqual(
      DEFAULT_AUDIO_SETTINGS
    );
  });

  it('限制音量到 0~1，并保留合法静音值', () => {
    expect(
      normalizeAudioSettings({
        musicVolume: 1.8,
        effectsVolume: -0.5,
        musicMuted: true,
        effectsMuted: false,
      })
    ).toEqual({
      musicVolume: 1,
      effectsVolume: 0,
      musicMuted: true,
      effectsMuted: false,
    });
  });

  it('静音通道的有效音量为零，另一通道不受影响', () => {
    expect(
      effectiveAudioLevels({
        musicVolume: 0.4,
        effectsVolume: 0.8,
        musicMuted: true,
        effectsMuted: false,
      })
    ).toEqual({ music: 0, effects: 0.8 });
  });
});

describe('audio settings persistence', () => {
  it('保存后可从同一设备恢复', () => {
    installMemoryStorage();
    const settings = {
      musicVolume: 0.42,
      effectsVolume: 0.63,
      musicMuted: false,
      effectsMuted: true,
    };

    saveAudioSettings(settings);
    expect(loadAudioSettings()).toEqual(settings);
  });

  it('损坏 JSON 和被拒绝的 localStorage 访问不会中断游戏', () => {
    installMemoryStorage('{broken');
    expect(loadAudioSettings()).toEqual(DEFAULT_AUDIO_SETTINGS);

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        get localStorage() {
          throw new DOMException('denied', 'SecurityError');
        },
      },
    });
    expect(loadAudioSettings()).toEqual(DEFAULT_AUDIO_SETTINGS);
    expect(() => saveAudioSettings(DEFAULT_AUDIO_SETTINGS)).not.toThrow();
  });
});
