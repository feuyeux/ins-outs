// Web Audio API procedural sound engine for Talbica clone
// Features: Generative Ambient Cosmic Drone (BGM) & Sci-Fi Harmonic SFX

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.isInitialized = false;

    // Settings (BGM defaults to muted/off)
    const hasStorage = typeof localStorage !== "undefined";
    this.bgmEnabled = hasStorage && localStorage.getItem("talbica_bgm") === "true";
    this.sfxEnabled = !hasStorage || localStorage.getItem("talbica_sfx") !== "false";
    this.masterVol = parseFloat((hasStorage && localStorage.getItem("talbica_vol")) || "0.4");
    this.bgmVol = parseFloat((hasStorage && localStorage.getItem("talbica_bgm_vol")) || "0.3");
    this.sfxVol = parseFloat((hasStorage && localStorage.getItem("talbica_sfx_vol")) || "0.5");

    // BGM Audio Nodes
    this.bgmGain = null;
    this.sfxGain = null;
    this.masterGain = null;
    this.bgmActive = false;
    this.bgmNodes = [];
    this.chimeTimer = null;
  }

  init() {
    if (this.isInitialized) {
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume();
      }
      return;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    this.ctx = new AudioContextClass();

    // Master Gain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.masterVol, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    // BGM Gain
    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.setValueAtTime(this.bgmEnabled ? this.bgmVol : 0, this.ctx.currentTime);
    this.bgmGain.connect(this.masterGain);

    // SFX Gain
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(this.sfxEnabled ? this.sfxVol : 0, this.ctx.currentTime);
    this.sfxGain.connect(this.masterGain);

    this.isInitialized = true;

    if (this.bgmEnabled) {
      this.startBGM();
    }
  }

  ensureContext() {
    if (!this.isInitialized) {
      this.init();
    } else if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  // --- BGM: Generative Ambient Cosmic Drone ---
  startBGM() {
    if (!this.isInitialized || this.bgmActive) return;
    this.bgmActive = true;

    try {
      const now = this.ctx.currentTime;

      // 1. Sub Bass Drone (A1: 55Hz)
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = "sine";
      subOsc.frequency.setValueAtTime(55, now);
      subGain.gain.setValueAtTime(0.15, now);
      subOsc.connect(subGain);
      subGain.connect(this.bgmGain);
      subOsc.start();
      this.bgmNodes.push(subOsc, subGain);

      // 2. Cosmic Harmonic Pad (E2: 82.4Hz, A2: 110Hz, C#3: 138.6Hz)
      const padFreqs = [82.4, 110, 138.6, 220];
      padFreqs.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = idx % 2 === 0 ? "triangle" : "sawtooth";
        osc.frequency.setValueAtTime(freq + (Math.random() * 0.4 - 0.2), now);

        // Lowpass filter with slow drifting LFO
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(320 + idx * 80, now);
        filter.Q.setValueAtTime(2.5, now);

        gain.gain.setValueAtTime(0.04 / padFreqs.length, now);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.bgmGain);
        osc.start();
        this.bgmNodes.push(osc, filter, gain);
      });

      // 3. Gentle Cosmic Wind / Atmosphere
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99 * b0 + white * 0.05;
        b1 = 0.95 * b1 + white * 0.1;
        b2 = 0.85 * b2 + white * 0.2;
        output[i] = (b0 + b1 + b2) * 0.05;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      noise.loop = true;

      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = "bandpass";
      noiseFilter.frequency.setValueAtTime(450, now);
      noiseFilter.Q.setValueAtTime(1.5, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.02, now);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.bgmGain);
      noise.start();
      this.bgmNodes.push(noise, noiseFilter, noiseGain);

      // 4. Random Generative Cosmic Chimes
      this.scheduleNextChime();
    } catch (e) {
      console.warn("AudioEngine BGM error:", e);
    }
  }

  scheduleNextChime() {
    if (!this.bgmActive) return;
    const delay = 4000 + Math.random() * 5000;
    this.chimeTimer = setTimeout(() => {
      if (this.bgmActive && this.bgmEnabled) {
        this.playCosmicChime();
      }
      this.scheduleNextChime();
    }, delay);
  }

  playCosmicChime() {
    if (!this.ctx || !this.bgmEnabled) return;
    try {
      const now = this.ctx.currentTime;
      // Pentatonic cosmic frequencies
      const scale = [440, 554.37, 659.25, 830.61, 987.77, 1108.73, 1318.51];
      const freq = scale[Math.floor(Math.random() * scale.length)];

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.06, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.5);

      osc.connect(gain);
      gain.connect(this.bgmGain);
      osc.start(now);
      osc.stop(now + 3.6);
    } catch (e) {}
  }

  stopBGM() {
    this.bgmActive = false;
    if (this.chimeTimer) {
      clearTimeout(this.chimeTimer);
      this.chimeTimer = null;
    }
    this.bgmNodes.forEach(node => {
      try {
        if (node.stop) node.stop();
        if (node.disconnect) node.disconnect();
      } catch (e) {}
    });
    this.bgmNodes = [];
  }

  toggleBGM() {
    this.ensureContext();
    this.bgmEnabled = !this.bgmEnabled;
    localStorage.setItem("talbica_bgm", this.bgmEnabled);

    if (this.bgmEnabled) {
      if (this.bgmGain) {
        this.bgmGain.gain.setTargetAtTime(this.bgmVol, this.ctx.currentTime, 0.1);
      }
      if (!this.bgmActive) this.startBGM();
    } else {
      if (this.bgmGain) {
        this.bgmGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      }
      this.stopBGM();
    }
    return this.bgmEnabled;
  }

  toggleSFX() {
    this.ensureContext();
    this.sfxEnabled = !this.sfxEnabled;
    localStorage.setItem("talbica_sfx", this.sfxEnabled);
    if (this.sfxGain) {
      this.sfxGain.gain.setTargetAtTime(this.sfxEnabled ? this.sfxVol : 0, this.ctx.currentTime, 0.05);
    }
    return this.sfxEnabled;
  }

  setMasterVolume(val) {
    this.masterVol = Math.max(0, Math.min(1, val));
    localStorage.setItem("talbica_vol", this.masterVol);
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.masterVol, this.ctx.currentTime, 0.05);
    }
  }

  setBGMVolume(val) {
    this.bgmVol = Math.max(0, Math.min(1, val));
    localStorage.setItem("talbica_bgm_vol", this.bgmVol);
    if (this.bgmGain && this.ctx && this.bgmEnabled) {
      this.bgmGain.gain.setTargetAtTime(this.bgmVol, this.ctx.currentTime, 0.05);
    }
  }

  setSFXVolume(val) {
    this.sfxVol = Math.max(0, Math.min(1, val));
    localStorage.setItem("talbica_sfx_vol", this.sfxVol);
    if (this.sfxGain && this.ctx && this.sfxEnabled) {
      this.sfxGain.gain.setTargetAtTime(this.sfxVol, this.ctx.currentTime, 0.05);
    }
  }

  // --- Interactive SFX ---

  // Element Hover: subtle harmonic chime proportional to atomic number Z
  playHover(atomicNumber = 1) {
    if (!this.sfxEnabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const num = parseInt(atomicNumber) || 1;
      // Base frequency 220Hz scaled by pentatonic-like curve with atomic number
      const baseFreq = 260 + (num % 36) * 18 + Math.floor(num / 36) * 120;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(baseFreq, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch (e) {}
  }

  // Element Click / Open Card: Sci-Fi Hologram Expansion Sound
  playOpen() {
    if (!this.sfxEnabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;

      // Tone 1: Rising sweep
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = "triangle";
      osc1.frequency.setValueAtTime(220, now);
      osc1.frequency.exponentialRampToValueAtTime(660, now + 0.25);

      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.12, now + 0.04);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc1.connect(gain1);
      gain1.connect(this.sfxGain);
      osc1.start(now);
      osc1.stop(now + 0.32);

      // Tone 2: Shimmer bell
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1320, now + 0.08);

      gain2.gain.setValueAtTime(0, now + 0.08);
      gain2.gain.linearRampToValueAtTime(0.09, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc2.connect(gain2);
      gain2.connect(this.sfxGain);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.52);
    } catch (e) {}
  }

  // Close Card: Clean downward swoosh
  playClose() {
    if (!this.sfxEnabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.16);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch (e) {}
  }

  // Tab Switch: Soft UI click/blip
  playTab() {
    if (!this.sfxEnabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(740, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.05);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.09);
    } catch (e) {}
  }

  // Mode Switch (Colors / Photos / Heatmaps)
  playModeSwitch() {
    if (!this.sfxEnabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      [440, 660].forEach((f, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(f, now + i * 0.04);
        gain.gain.setValueAtTime(0.08, now + i * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.12);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now + i * 0.04);
        osc.stop(now + i * 0.04 + 0.13);
      });
    } catch (e) {}
  }

  // Calculate / Reaction Balance Success
  playBalance() {
    if (!this.sfxEnabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C Major arpeggio
      notes.forEach((f, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(f, now + i * 0.07);

        gain.gain.setValueAtTime(0, now + i * 0.07);
        gain.gain.linearRampToValueAtTime(0.09, now + i * 0.07 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.35);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now + i * 0.07);
        osc.stop(now + i * 0.07 + 0.36);
      });
    } catch (e) {}
  }
}

export const audioEngine = new AudioEngine();
export default audioEngine;
