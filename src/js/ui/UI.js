export class UI {
  constructor() {
    this.elements = {
      hud: document.getElementById('hud'),
      streakValue: document.getElementById('streak-value'),
      crowdValue: document.getElementById('crowd-value'),
      shapeIcon: document.getElementById('shape-icon'),
      startScreen: document.getElementById('start-screen'),
      startBtn: document.getElementById('start-btn'),
      gameoverScreen: document.getElementById('gameover-screen'),
      gameoverTitle: document.getElementById('gameover-title'),
      finalStreak: document.getElementById('final-streak'),
      finalCrowd: document.getElementById('final-crowd'),
      restartBtn: document.getElementById('restart-btn'),
      streakProgressFill: document.getElementById('streak-progress-fill'),
      streakProgressGlow: document.getElementById('streak-progress-glow'),
      streakDisplay: document.getElementById('streak-display'),
      streakTierLabel: document.getElementById('streak-tier-label')
    };

    this.debugEl = null;
    this._streakAnimTimeout = null;
    this._streakFloatTimeout = null;
    this._milestoneTimeout = null;
    this._progressAnimTimeout = null;
  }

  showHUD() {
    this.elements.hud.classList.remove('hidden');
  }

  hideHUD() {
    this.elements.hud.classList.add('hidden');
  }

  updateStreak(value) {
    this.elements.streakValue.textContent = value;
    if (value > 0) {
      this.elements.streakValue.style.color = '#4aff8a';
      this.elements.streakValue.style.textShadow = '0 0 12px rgba(74,255,138,0.5)';
    } else {
      this.elements.streakValue.style.color = '#fff';
      this.elements.streakValue.style.textShadow = '0 0 12px rgba(255,255,255,0.3)';
    }
  }

  updateCrowd(value) {
    this.elements.crowdValue.textContent = value;
  }

  updateStreakProgress(streak) {
    const tierProgress = this._calculateTierProgress(streak);
    const fill = this.elements.streakProgressFill;
    const glow = this.elements.streakProgressGlow;
    const display = this.elements.streakDisplay;
    const label = this.elements.streakTierLabel;

    if (!fill || !glow || !display || !label) return;

    clearTimeout(this._progressAnimTimeout);

    fill.classList.remove('resetting');
    fill.style.width = tierProgress.percent + '%';
    glow.style.width = tierProgress.percent + '%';

    this._updateProgressState(streak, display, fill);

    if (tierProgress.isMilestone) {
      label.textContent = `${tierProgress.tierStart + 10} / ${tierProgress.tierStart + 10}`;
      this._triggerMilestonePulse(display, fill, glow);
    } else {
      label.textContent = `${tierProgress.currentInTier} / 10`;
    }
  }

  _calculateTierProgress(streak) {
    if (streak === 0) {
      return { percent: 0, currentInTier: 0, tierStart: 0, isMilestone: false };
    }

    const tierStart = Math.floor((streak - 1) / 10) * 10;
    const currentInTier = streak - tierStart;
    const isMilestone = streak % 10 === 0;
    const percent = isMilestone ? 100 : (currentInTier / 10) * 100;

    return { percent, currentInTier, tierStart, isMilestone };
  }

  _updateProgressState(streak, display, fill) {
    display.classList.remove('hot', 'approaching', 'milestone');
    fill.classList.remove('state-building', 'state-hot', 'state-approaching', 'state-milestone');

    if (streak === 0) {
      fill.classList.add('state-building');
      return;
    }

    const currentInTier = streak % 10 === 0 ? 10 : streak % 10;

    if (currentInTier === 5) {
      display.classList.add('hot');
      fill.classList.add('state-hot');
    } else if (currentInTier >= 8 && currentInTier <= 9) {
      display.classList.add('approaching');
      fill.classList.add('state-approaching');
    } else if (currentInTier === 10) {
      display.classList.add('milestone');
      fill.classList.add('state-milestone');
    } else {
      fill.classList.add('state-building');
    }
  }

  _triggerMilestonePulse(display, fill, glow) {
    display.classList.add('milestone');
    fill.classList.add('state-milestone');
    glow.style.opacity = '1';

    setTimeout(() => {
      display.classList.remove('milestone');
      fill.classList.remove('state-milestone');
      glow.style.opacity = '0';
    }, 800);
  }

  resetStreakProgress() {
    const fill = this.elements.streakProgressFill;
    const glow = this.elements.streakProgressGlow;
    const display = this.elements.streakDisplay;
    const label = this.elements.streakTierLabel;

    if (!fill || !glow || !display || !label) return;

    fill.classList.add('resetting');
    fill.style.width = '0%';
    glow.style.width = '0%';
    display.classList.remove('hot', 'approaching', 'milestone');
    fill.classList.remove('state-building', 'state-hot', 'state-approaching', 'state-milestone');
    fill.classList.add('state-building');
    label.textContent = '1 / 10';
  }

  updateShapeIndicator(shape) {
    const icon = this.elements.shapeIcon;
    icon.className = '';
    icon.classList.add(shape);
  }

  showStartScreen() {
    this.elements.startScreen.classList.remove('hidden');
    this.elements.gameoverScreen.classList.add('hidden');
  }

  hideStartScreen() {
    this.elements.startScreen.classList.add('hidden');
  }

  showGameOver(streak, crowd) {
    this.elements.gameoverScreen.classList.remove('hidden');
    this.elements.finalStreak.textContent = streak;
    this.elements.finalCrowd.textContent = crowd;
  }

  hideGameOver() {
    this.elements.gameoverScreen.classList.add('hidden');
  }

  showStreakPopup(text, isMiss = false) {
    const popup = document.createElement('div');
    popup.className = 'streak-popup' + (isMiss ? ' miss' : '');
    popup.textContent = text;
    document.getElementById('game-container').appendChild(popup);
    setTimeout(() => popup.remove(), 800);
  }

  onStreakIncrement(streak, isPerfectMatch = false) {
    this.updateStreakProgress(streak);
    this._animateStreakNumber(streak);
    this._showStreakIncrementText(streak, isPerfectMatch);
    this._checkMilestones(streak);
  }

  onStreakReset() {
    this.resetStreakProgress();
  }

  _animateStreakNumber(streak) {
    const el = this.elements.streakValue;
    el.classList.remove('streak-pop');
    void el.offsetWidth;
    el.classList.add('streak-pop');
    clearTimeout(this._streakAnimTimeout);
    this._streakAnimTimeout = setTimeout(() => {
      el.classList.remove('streak-pop');
    }, 300);

    if (streak >= 3 && streak <= 4) {
      el.classList.add('streak-pop-medium');
      void el.offsetWidth;
      clearTimeout(this._streakAnimTimeout);
      this._streakAnimTimeout = setTimeout(() => {
        el.classList.remove('streak-pop-medium');
      }, 400);
    }

    if (streak === 5 || streak === 10) {
      el.classList.add('streak-pop-milestone');
      void el.offsetWidth;
      clearTimeout(this._streakAnimTimeout);
      this._streakAnimTimeout = setTimeout(() => {
        el.classList.remove('streak-pop-milestone');
      }, 600);
    }
  }

  _showStreakIncrementText(streak, isPerfectMatch = false) {
    const popup = document.createElement('div');
    popup.className = 'streak-increment';
    popup.textContent = isPerfectMatch ? 'PERFECT!' : '+1 STREAK';
    if (isPerfectMatch) {
      popup.classList.add('perfect-increment');
    }
    const streakDisplay = document.getElementById('streak-display');
    streakDisplay.appendChild(popup);
    setTimeout(() => popup.remove(), 800);
  }

  _checkMilestones(streak) {
    clearTimeout(this._milestoneTimeout);

    if (streak === 5) {
      this._showMilestoneText('5 STREAK!', 'FLOW!');
    } else if (streak === 10) {
      this._showMilestoneText('10 STREAK!', '10 HIT COMBO!');
    }
  }

  _showMilestoneText(title, subtitle) {
    const container = document.getElementById('game-container');

    const titleEl = document.createElement('div');
    titleEl.className = 'milestone-title';
    titleEl.textContent = title;
    container.appendChild(titleEl);

    const subEl = document.createElement('div');
    subEl.className = 'milestone-subtitle';
    subEl.textContent = subtitle;
    container.appendChild(subEl);

    setTimeout(() => titleEl.remove(), 1200);
    setTimeout(() => subEl.remove(), 1200);
  }

  updateDebugOverlay(text) {
    if (!this.debugEl) {
      this.debugEl = document.createElement('div');
      this.debugEl.style.cssText = 'position:absolute;top:80px;left:8px;right:8px;font-size:10px;font-family:monospace;color:#0f0;background:rgba(0,0,0,0.7);padding:8px;border-radius:6px;pointer-events:none;z-index:200;white-space:pre;line-height:1.4;';
      document.getElementById('game-container').appendChild(this.debugEl);
    }
    this.debugEl.textContent = text;
  }

  onStart(callback) {
    this.elements.startBtn.addEventListener('click', callback);
    this.elements.startBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      callback();
    });
  }

  onRestart(callback) {
    this.elements.restartBtn.addEventListener('click', callback);
    this.elements.restartBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      callback();
    });
  }
}