import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioEngine, clampVolume } from '../audioEngine';

const originalWindowDescriptor = Object.getOwnPropertyDescriptor(
  globalThis,
  'window'
);

class FakeAudioParam {
  readonly targets: number[] = [];

  setTargetAtTime(value: number): AudioParam {
    this.targets.push(value);
    return this as unknown as AudioParam;
  }

  setValueAtTime(): AudioParam {
    return this as unknown as AudioParam;
  }

  exponentialRampToValueAtTime(): AudioParam {
    return this as unknown as AudioParam;
  }
}

class FakeAudioNode {
  connect(): AudioNode {
    return this as unknown as AudioNode;
  }
}

class FakeGainNode extends FakeAudioNode {
  readonly gain = new FakeAudioParam();
}

class FakeOscillatorNode extends FakeAudioNode {
  readonly frequency = new FakeAudioParam();
  type: OscillatorType = 'sine';
  started = false;
  stopped = false;

  start(): void {
    this.started = true;
  }

  stop(): void {
    this.stopped = true;
  }
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];

  state: AudioContextState = 'suspended';
  currentTime = 10;
  readonly destination = new FakeAudioNode() as unknown as AudioDestinationNode;
  readonly gains: FakeGainNode[] = [];
  readonly oscillators: FakeOscillatorNode[] = [];

  constructor() {
    FakeAudioContext.instances.push(this);
  }

  createGain(): GainNode {
    const gain = new FakeGainNode();
    this.gains.push(gain);
    return gain as unknown as GainNode;
  }

  createOscillator(): OscillatorNode {
    const oscillator = new FakeOscillatorNode();
    this.oscillators.push(oscillator);
    return oscillator as unknown as OscillatorNode;
  }

  async resume(): Promise<void> {
    this.state = 'running';
  }

  async close(): Promise<void> {
    this.state = 'closed';
  }
}

function installAudioWindow(withContext = true): void {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: withContext
      ? { AudioContext: FakeAudioContext as unknown as typeof AudioContext }
      : {},
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  FakeAudioContext.instances = [];
});

afterEach(() => {
  vi.useRealTimers();
  if (originalWindowDescriptor) {
    Object.defineProperty(globalThis, 'window', originalWindowDescriptor);
  } else {
    Reflect.deleteProperty(globalThis, 'window');
  }
});

describe('AudioEngine', () => {
  it('首次解锁前不创建 AudioContext，并在解锁后应用分轨音量', async () => {
    installAudioWindow();
    const engine = new AudioEngine();
    engine.setLevels({ music: 0, effects: 0.55 });

    expect(FakeAudioContext.instances).toHaveLength(0);
    await expect(engine.unlock()).resolves.toBe(true);

    const context = FakeAudioContext.instances[0];
    expect(context.state).toBe('running');
    expect(context.gains).toHaveLength(2);
    const musicTargets = context.gains[0].gain.targets;
    const effectsTargets = context.gains[1].gain.targets;
    expect(musicTargets[musicTargets.length - 1]).toBe(0);
    expect(effectsTargets[effectsTargets.length - 1]).toBe(0.55);

    engine.play('select');
    expect(context.oscillators).toHaveLength(1);
    expect(context.oscillators[0].started).toBe(true);
    expect(context.oscillators[0].stopped).toBe(true);
    engine.dispose();
    expect(context.state).toBe('closed');
  });

  it('音乐音量从零调高时立即开始并持续调度循环', async () => {
    installAudioWindow();
    const engine = new AudioEngine();
    engine.setLevels({ music: 0, effects: 0 });
    await engine.unlock();
    const context = FakeAudioContext.instances[0];

    engine.setLevels({ music: 0.2, effects: 0 });
    const firstBarCount = context.oscillators.length;
    expect(firstBarCount).toBeGreaterThan(8);

    vi.advanceTimersByTime(4000);
    expect(context.oscillators.length).toBeGreaterThan(firstBarCount);
    engine.dispose();
  });

  it('浏览器不支持 Web Audio 时安静降级', async () => {
    installAudioWindow(false);
    const engine = new AudioEngine();

    await expect(engine.unlock()).resolves.toBe(false);
    expect(() => engine.play('win')).not.toThrow();
    engine.dispose();
  });
});

describe('clampVolume', () => {
  it('把任意数值限制为合法音量', () => {
    expect(clampVolume(-1)).toBe(0);
    expect(clampVolume(0.45)).toBe(0.45);
    expect(clampVolume(2)).toBe(1);
    expect(clampVolume(Number.NaN)).toBe(0);
  });
});
