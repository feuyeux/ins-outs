export type SoundEffect =
  | 'select'
  | 'pour'
  | 'reject'
  | 'reveal'
  | 'undo'
  | 'restart'
  | 'hint'
  | 'rescue'
  | 'win'
  | 'deadlock'
  | 'navigate';

export interface AudioLevels {
  music: number;
  effects: number;
}

type AudioContextConstructor = new () => AudioContext;
type AudioWindow = Window & {
  AudioContext?: AudioContextConstructor;
  webkitAudioContext?: AudioContextConstructor;
};

const MUSIC_STEP_SECONDS = 0.48;
const MUSIC_BAR_SECONDS = MUSIC_STEP_SECONDS * 8;
const MUSIC_NOTES = [220, 277.18, 329.63, 277.18, 246.94, 329.63, 369.99, 329.63];

const EFFECT_PATTERNS: Record<
  Exclude<SoundEffect, 'pour'>,
  Array<[frequency: number, delay: number, duration: number, gain?: number]>
> = {
  select: [[520, 0, 0.055, 0.12]],
  reject: [
    [170, 0, 0.09, 0.16],
    [130, 0.08, 0.12, 0.14],
  ],
  reveal: [
    [620, 0, 0.12, 0.12],
    [830, 0.09, 0.18, 0.13],
  ],
  undo: [
    [420, 0, 0.08, 0.1],
    [310, 0.07, 0.12, 0.11],
  ],
  restart: [
    [280, 0, 0.07, 0.1],
    [390, 0.06, 0.08, 0.1],
    [520, 0.12, 0.13, 0.11],
  ],
  hint: [
    [660, 0, 0.1, 0.11],
    [880, 0.11, 0.2, 0.1],
  ],
  rescue: [
    [330, 0, 0.1, 0.11],
    [440, 0.08, 0.1, 0.11],
    [660, 0.16, 0.22, 0.12],
  ],
  win: [
    [392, 0, 0.18, 0.13],
    [523.25, 0.14, 0.2, 0.13],
    [659.25, 0.29, 0.22, 0.14],
    [783.99, 0.45, 0.38, 0.14],
  ],
  deadlock: [
    [246.94, 0, 0.18, 0.12],
    [207.65, 0.14, 0.2, 0.12],
    [164.81, 0.3, 0.3, 0.13],
  ],
  navigate: [[440, 0, 0.07, 0.1]],
};

export function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/**
 * 轻量 Web Audio 合成器。AudioContext 只在首次用户手势后创建，避免触发
 * 浏览器自动播放限制；音乐与音效使用独立 GainNode，便于分别调节。
 */
export class AudioEngine {
  private context: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private effectsGain: GainNode | null = null;
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private levels: AudioLevels = { music: 0.28, effects: 0.72 };
  private disposed = false;

  async unlock(): Promise<boolean> {
    if (this.disposed || typeof window === 'undefined') return false;

    if (!this.context) {
      const audioWindow = window as AudioWindow;
      const Context = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
      if (!Context) return false;

      const context = new Context();
      const musicGain = context.createGain();
      const effectsGain = context.createGain();
      musicGain.connect(context.destination);
      effectsGain.connect(context.destination);
      this.context = context;
      this.musicGain = musicGain;
      this.effectsGain = effectsGain;
      this.applyLevels();
    }

    const context = this.context;
    if (context.state === 'suspended') {
      try {
        await context.resume();
      } catch {
        return false;
      }
    }

    if (context.state !== 'running') return false;
    this.syncMusicLoop();
    return true;
  }

  setLevels(levels: AudioLevels): void {
    this.levels = {
      music: clampVolume(levels.music),
      effects: clampVolume(levels.effects),
    };
    this.applyLevels();
    this.syncMusicLoop();
  }

  play(effect: SoundEffect): void {
    const context = this.context;
    if (
      !context ||
      context.state !== 'running' ||
      !this.effectsGain ||
      this.levels.effects <= 0
    ) {
      return;
    }

    const start = context.currentTime + 0.008;
    if (effect === 'pour') {
      this.playTone(this.effectsGain, start, 460, 210, 0.34, 0.13, 'sine');
      this.playTone(this.effectsGain, start + 0.07, 310, 180, 0.3, 0.07, 'triangle');
      return;
    }

    for (const [frequency, delay, duration, gain = 0.1] of EFFECT_PATTERNS[effect]) {
      this.playTone(
        this.effectsGain,
        start + delay,
        frequency,
        frequency,
        duration,
        gain,
        effect === 'reject' || effect === 'deadlock' ? 'triangle' : 'sine'
      );
    }
  }

  dispose(): void {
    this.disposed = true;
    this.stopMusicLoop();
    const context = this.context;
    this.context = null;
    this.musicGain = null;
    this.effectsGain = null;
    if (context && context.state !== 'closed') void context.close();
  }

  private applyLevels(): void {
    const context = this.context;
    if (!context) return;
    this.musicGain?.gain.setTargetAtTime(this.levels.music, context.currentTime, 0.03);
    this.effectsGain?.gain.setTargetAtTime(this.levels.effects, context.currentTime, 0.015);
  }

  private syncMusicLoop(): void {
    if (
      this.context?.state === 'running' &&
      this.musicGain &&
      this.levels.music > 0
    ) {
      if (this.musicTimer === null) {
        this.scheduleMusicBar();
        this.musicTimer = setInterval(
          () => this.scheduleMusicBar(),
          MUSIC_BAR_SECONDS * 1000
        );
      }
      return;
    }
    this.stopMusicLoop();
  }

  private stopMusicLoop(): void {
    if (this.musicTimer !== null) clearInterval(this.musicTimer);
    this.musicTimer = null;
  }

  private scheduleMusicBar(): void {
    const context = this.context;
    const output = this.musicGain;
    if (!context || context.state !== 'running' || !output) return;

    const start = context.currentTime + 0.05;
    MUSIC_NOTES.forEach((frequency, index) => {
      const noteStart = start + index * MUSIC_STEP_SECONDS;
      this.playTone(output, noteStart, frequency, frequency, 0.34, 0.035, 'sine');
      if (index % 2 === 0) {
        this.playTone(
          output,
          noteStart,
          frequency / 2,
          frequency / 2,
          0.42,
          0.022,
          'triangle'
        );
      }
    });
  }

  private playTone(
    output: AudioNode,
    start: number,
    startFrequency: number,
    endFrequency: number,
    duration: number,
    volume: number,
    type: OscillatorType
  ): void {
    const context = this.context;
    if (!context) return;

    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const end = start + duration;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(startFrequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(1, endFrequency),
      end
    );
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(volume, start + Math.min(0.025, duration / 3));
    envelope.gain.exponentialRampToValueAtTime(0.0001, end);
    oscillator.connect(envelope);
    envelope.connect(output);
    oscillator.start(start);
    oscillator.stop(end + 0.01);
  }
}
