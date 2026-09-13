export class Audio {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.initialized = true;
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
    }
  }

  playPerfect() {
    this._playTone(880, 0.1, 'sine', 0.3);
    setTimeout(() => this._playTone(1047, 0.1, 'sine', 0.3), 80);
    setTimeout(() => this._playTone(1319, 0.15, 'sine', 0.25), 160);
    setTimeout(() => this._playTone(1568, 0.2, 'sine', 0.2), 240);
  }
}