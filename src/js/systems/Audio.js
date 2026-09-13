export class Audio {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.initialized = false;
    // Music properties
    this.musicBuffer = null;
    this.musicSource = null;
    this.musicGain = null;
    this.musicVolume = 0.5;
    this.isMusicPlaying = false;
  }

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.initialized = true;
      // Create a gain node for music volume control
      this.musicGain = this.ctx.createGain();
      this.musicGain.connect(this.ctx.destination);
      // Generate a simple music buffer (2 seconds of a repeating melody)
      this._generateMusicBuffer();
    } catch (e) {
      this.enabled = false;
    }
  }

  _playTone(freq, duration, type = 'sine', volume = 0.3) {
    if (!this.enabled || !this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playMatch(streak = 1) {
    const vol = Math.min(0.25 + streak * 0.02, 0.4);
    this._playTone(523, 0.12, 'sine', vol);
    setTimeout(() => this._playTone(659, 0.12, 'sine', vol * 0.8), 60);
    setTimeout(() => this._playTone(784, 0.15, 'sine', vol * 0.6), 120);
  }

  playMismatch() {
    this._playTone(200, 0.2, 'square', 0.15);
    setTimeout(() => this._playTone(150, 0.25, 'square', 0.1), 80);
  }

  playCrash() {
    this._playTone(100, 0.3, 'sawtooth', 0.2);
    setTimeout(() => this._playTone(80, 0.3, 'sawtooth', 0.15), 50);
    setTimeout(() => this._playTone(60, 0.4, 'sawtooth', 0.1), 100);
  }

  playPop() {
    this._playTone(880, 0.08, 'sine', 0.15);
  }

  playSwitch() {
    this._playTone(440, 0.06, 'sine', 0.1);
  }

  playJump() {
    this._playTone(330, 0.1, 'sine', 0.12);
    setTimeout(() => this._playTone(440, 0.08, 'sine', 0.1), 40);
  }

  playMilestone(streak) {
    if (streak === 5) {
      this._playTone(523, 0.15, 'sine', 0.3);
      setTimeout(() => this._playTone(659, 0.15, 'sine', 0.3), 100);
      setTimeout(() => this._playTone(784, 0.15, 'sine', 0.3), 200);
      setTimeout(() => this._playTone(1047, 0.2, 'sine', 0.25), 300);
      setTimeout(() => this._playTone(1319, 0.25, 'sine', 0.2), 400);
    } else if (streak === 10) {
      this._playTone(523, 0.15, 'sine', 0.35);
      setTimeout(() => this._playTone(659, 0.15, 'sine', 0.35), 80);
      setTimeout(() => this._playTone(784, 0.15, 'sine', 0.35), 160);
      setTimeout(() => this._playTone(1047, 0.2, 'sine', 0.3), 240);
      setTimeout(() => this._playTone(1319, 0.25, 'sine', 0.25), 320);
      setTimeout(() => this._playTone(1568, 0.3, 'sine', 0.2), 420);
      setTimeout(() => this._playTone(2093, 0.35, 'sine', 0.15), 520);
    } else if (streak === 20) {
      this._playTone(523, 0.2, 'sine', 0.4);
      setTimeout(() => this._playTone(659, 0.2, 'sine', 0.4), 100);
      setTimeout(() => this._playTone(784, 0.2, 'sine', 0.4), 200);
      setTimeout(() => this._playTone(1047, 0.25, 'sine', 0.35), 300);
      setTimeout(() => this._playTone(1319, 0.3, 'sine', 0.3), 400);
      setTimeout(() => this._playTone(1568, 0.35, 'sine', 0.25), 500);
      setTimeout(() => this._playTone(2093, 0.4, 'sine', 0.2), 600);
    } else if (streak === 30) {
      this._playTone(523, 0.25, 'sine', 0.45);
      setTimeout(() => this._playTone(659, 0.25, 'sine', 0.45), 100);
      setTimeout(() => this._playTone(784, 0.25, 'sine', 0.45), 200);
      setTimeout(() => this._playTone(1047, 0.3, 'sine', 0.4), 300);
      setTimeout(() => this._playTone(1319, 0.35, 'sine', 0.35), 400);
      setTimeout(() => this._playTone(1568, 0.4, 'sine', 0.3), 500);
      setTimeout(() => this._playTone(2093, 0.45, 'sine', 0.25), 600);
    }
  }

  playPerfect() {
    this._playTone(880, 0.1, 'sine', 0.3);
    setTimeout(() => this._playTone(1047, 0.1, 'sine', 0.3), 80);
    setTimeout(() => this._playTone(1319, 0.15, 'sine', 0.25), 160);
    setTimeout(() => this._playTone(1568, 0.2, 'sine', 0.2), 240);
  }

  playPerfectCombo3() {
    this._playTone(880, 0.08, 'sine', 0.25);
    setTimeout(() => this._playTone(1100, 0.08, 'sine', 0.25), 60);
    setTimeout(() => this._playTone(1320, 0.12, 'sine', 0.2), 120);
  }

  playPerfectCombo5() {
    this._playTone(660, 0.1, 'sine', 0.3);
    setTimeout(() => this._playTone(880, 0.1, 'sine', 0.3), 80);
    setTimeout(() => this._playTone(1100, 0.1, 'sine', 0.25), 160);
    setTimeout(() => this._playTone(1320, 0.15, 'sine', 0.25), 240);
    setTimeout(() => this._playTone(1760, 0.2, 'sine', 0.2), 320);
  }

  playNearMiss() {
    this._playTone(660, 0.06, 'sine', 0.15);
    setTimeout(() => this._playTone(580, 0.08, 'sine', 0.12), 50);
  }

  playRivalDefeated() {
    this._playTone(880, 0.1, 'sine', 0.3);
    setTimeout(() => this._playTone(1100, 0.1, 'sine', 0.25), 80);
    setTimeout(() => this._playTone(1320, 0.15, 'sine', 0.2), 160);
    setTimeout(() => this._playTone(1760, 0.2, 'sine', 0.15), 240);
  }

  _generateMusicBuffer() {
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * 2; // 2 seconds
    this.musicBuffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = this.musicBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      // Create a simple melody: C4 for 0.5s, E4 for 0.5s, G4 for 0.5s, C5 for 0.5s
      const noteIndex = Math.floor((i / (sampleRate * 0.5)) % 4);
      const freq = [261.63, 329.63, 392.00, 523.25][noteIndex];
      data[i] = Math.sin(2 * Math.PI * freq * t) * 0.2;
    }
  }

  startMusic() {
    if (!this.enabled || !this.ctx || this.isMusicPlaying) return;
    this.isMusicPlaying = true;
    this._playMusicLoop();
  }

  _playMusicLoop() {
    if (!this.isMusicPlaying) return;
    // Create a buffer source
    this.musicSource = this.ctx.createBufferSource();
    this.musicSource.buffer = this.musicBuffer;
    this.musicSource.loop = true;
    // Connect through the gain node
    this.musicSource.connect(this.musicGain);
    this.musicGain.connect(this.ctx.destination);
    // Start the source
    this.musicSource.start(0);
  }

  stopMusic() {
    this.isMusicPlaying = false;
    if (this.musicSource) {
      this.musicSource.stop(0);
      this.musicSource = null;
    }
  }

  setMusicVolume(volume) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.musicGain) {
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
    }
  }

  updateMusicIntensity(streak) {
    // Adjust music volume based on streak
    let volume = 0.2; // base volume
    if (streak >= 5) {
      volume = 0.25;
    }
    if (streak >= 10) {
      volume = 0.3;
    }
    if (streak >= 20) {
      volume = 0.4;
    }
    if (streak >= 30) {
      volume = 0.5; // max intensity
    }
    this.setMusicVolume(volume);
  }
}