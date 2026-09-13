import * as THREE from 'three';
import { CONFIG } from './engine/Config.js';
import { Input } from './engine/Input.js';
import { Player } from './entities/Player.js';
import { Track } from './entities/Track.js';
import { Crowd } from './entities/Crowd.js';
import { Spawner } from './systems/Spawner.js';
import { Collision } from './systems/Collision.js';
import { Effects } from './systems/Effects.js';
import { Audio } from './systems/Audio.js';
import { UI } from './ui/UI.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.state = 'menu';
    this.score = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.speed = CONFIG.BASE_SPEED;
    this.distanceTraveled = 0;
    this.frameCount = 0;

    this.mismatchRecoveryTimer = 0;
    this.perfectCombo = 0;
    this.nearMissChain = 0;
    this.nearMissChainTimer = 0;

    this._initRenderer();
    this._initScene();
    this._initCamera();
    this._initSystems();

    this.lastTime = performance.now();
    this.animFrameId = null;
  }

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      powerPreference: 'low-power'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(CONFIG.BG_COLOR);
    this.renderer.shadowMap.enabled = false;

    window.addEventListener('resize', () => this._onResize());
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(CONFIG.BG_COLOR, 15, 55);
  }

  _initCamera() {
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(65, aspect, 0.1, 100);
    this.camera.position.set(0, 5.5, 8);
    this.camera.lookAt(0, 0.5, -8);
  }

  _initSystems() {
    this.input = new Input(this.canvas);
    this.audio = new Audio();
    this.ui = new UI();
    this.effects = new Effects(this.scene);
    this.track = new Track(this.scene);
    this.player = new Player(this.scene);
    this.crowd = new Crowd(this.scene, this.track);
    this.spawner = new Spawner(this.scene);
    this.collision = new Collision(this.spawner, this.player, this.crowd);

    this._bindInput();
    this._bindUI();
    this.ui.showStartScreen();
  }

  _bindInput() {
    this.input.on('swipeLeft', () => {
      if (this.state !== 'playing') return;
      if (this.player.switchLane(-1)) {
        this.audio.playSwitch();
      }
    });

    this.input.on('swipeRight', () => {
      if (this.state !== 'playing') return;
      if (this.player.switchLane(1)) {
        this.audio.playSwitch();
      }
    });

    this.input.on('swipeUp', () => {
      if (this.state !== 'playing') return;
      if (this.player.jump()) {
        this.audio.playJump();
      }
    });

    this.input.on('tap', () => {
      if (this.state !== 'playing') return;
      const shape = this.player.cycleShape();
      if (shape) {
        this.audio.playSwitch();
        this.ui.updateShapeIndicator(shape);
        this.effects.spawnShapeChangeParticles(
          this.player.mesh.position.x,
          this.player.mesh.position.y,
          this.player.mesh.position.z,
          shape
        );
      }
    });
  }

  _bindUI() {
    this.ui.onStart(() => this.start());
    this.ui.onRestart(() => this.restart());
  }

  start() {
    this.audio.init();
    this.audio.startMusic();
    this.ui.hideStartScreen();
    this.ui.showHUD();
    this.ui.updateShapeIndicator(this.player.currentShape);
    this.state = 'playing';
    this.lastTime = performance.now();
  }

  restart() {
    this.score = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.speed = CONFIG.BASE_SPEED;
    this.distanceTraveled = 0;
    this.frameCount = 0;
    this.mismatchRecoveryTimer = 0;
    this.perfectCombo = 0;
    this.nearMissChain = 0;
    this.nearMissChainTimer = 0;

    this.player.reset();
    this.crowd.reset();
    this.spawner.reset();
    this.track.reset();
    this.effects.reset();

    this.ui.hideGameOver();
    this.ui.updateStreak(0);
    this.ui.onStreakReset();
    this.ui.updateCrowd(0);
    this.ui.updateShapeIndicator(this.player.currentShape);
    this.state = 'playing';
    this.audio.startMusic();
    this.lastTime = performance.now();
  }

  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  _handleCollisions() {
    const results = this.collision.checkAll();
    const px = this.player.mesh.position.x;
    const py = this.player.mesh.position.y;
    const pz = this.player.mesh.position.z;

    if (results.barrierHit) {
      this.audio.playCrash();
      this.effects.spawnCrashParticles(px, py, pz);

      const crowdCount = this.crowd.getCount();
      const lostCrowd = this.crowd.removeMembers(
        Math.ceil(crowdCount * CONFIG.BARRIER_CROWD_LOSS_PERCENT) + 1
      );

      this.streak = 0;
      this.speed = Math.max(CONFIG.BASE_SPEED, this.speed - CONFIG.BARRIER_SPEED_PENALTY);

      this.ui.updateStreak(0);
      this.ui.onStreakReset();
      this.ui.showStreakPopup('CRASH! -' + lostCrowd, true);

      // Reset chains on barrier hit
      this._resetPerfectCombo();
      this._resetNearMissChain();

      for (const barrier of this.spawner.getActiveBarriers()) {
        if (barrier.active && barrier.processedThisFrame) {
          this.spawner.removeBarrier(barrier);
          break;
        }
      }
    }

    // Handle Rival interaction
    const rival = this.spawner.getActiveRival();
    if (rival && rival.active && !rival.defeated) {
      const rivalDist = rival.getDistanceToPlayer(pz);
      if (rivalDist < 25) { // Interaction range
        rival.startInteraction();
      }
    }

    for (const npc of results.npcMatch) {
      const isPerfect = this._checkPerfectMatch();
      npc.isPerfectCatch = isPerfect;

      npc.makeHappy();
      const reward = npc.crowdReward || 1;
      for (let i = 0; i < reward; i++) {
        this.crowd.addMember(npc.shape);
      }
      this.spawner.removeNPC(npc);

      this.streak++;
      this.score++;
      this.bestStreak = Math.max(this.bestStreak, this.streak);

      this.speed = CONFIG.BASE_SPEED + Math.floor(this.streak / CONFIG.STREAK_SPEED_BONUS) * CONFIG.SPEED_INCREMENT;
      this.speed = Math.min(this.speed, CONFIG.MAX_SPEED);

      // Check for rival perfect sequence
      if (rival && rival.interactionActive) {
        const defeated = rival.recordPerfectMatch();
        if (defeated) {
          this._onRivalDefeated(rival);
        }
      }

      this._onSuccessfulMatch(npc, isPerfect);
    }

    for (const npc of results.npcMismatch) {
      this.audio.playMismatch();

      this.effects.spawnMismatchParticles(
        npc.group.position.x,
        npc.group.position.y,
        npc.group.position.z
      );

      const lostCrowd = this.crowd.removeMembers(CONFIG.MISMATCH_CROWD_LOSS);
      this.spawner.removeNPC(npc);

      this.streak = 0;
      this.speed = Math.max(CONFIG.BASE_SPEED, this.speed - CONFIG.MISMATCH_SPEED_FRACTION);
      this.mismatchRecoveryTimer = CONFIG.MISMATCH_SPEED_RECOVERY_FRAMES;

      this.ui.updateStreak(0);
      this.ui.onStreakReset();
      this.ui.updateCrowd(this.crowd.getCount());
      this.ui.showStreakPopup('WRONG! -' + lostCrowd, true);

      // Reset perfect combo on mismatch
      this._resetPerfectCombo();

      // Rival interaction: mismatch ends sequence
      if (rival && rival.interactionActive) {
        rival.recordMismatch();
      }
    }

    for (const nearMiss of results.nearMiss) {
      this._onNearMiss(nearMiss);
    }

    if (this.crowd.getCount() === 0 && this.score > 0) {
      this._gameOver();
    }
  }

  _updateSpeed() {
    const targetSpeed = CONFIG.BASE_SPEED + Math.floor(this.streak / CONFIG.STREAK_SPEED_BONUS) * CONFIG.SPEED_INCREMENT;
    const clampedTarget = Math.min(targetSpeed, CONFIG.MAX_SPEED);

    if (this.mismatchRecoveryTimer > 0) {
      this.mismatchRecoveryTimer--;
      if (this.mismatchRecoveryTimer <= 0) {
        this.speed = clampedTarget;
      }
    } else {
      this.speed = clampedTarget;
    }
  }

  _onSuccessfulMatch(npc, isPerfectMatch = false) {
    this.audio.playMatch(this.streak);
    this.audio.playPop();

    if (this.streak === 5 || (this.streak >= 10 && this.streak % 10 === 0)) {
      this.audio.playMilestone(this.streak);
    }

    if (isPerfectMatch) {
      this.audio.playPerfect();
      this._incrementPerfectCombo();
    } else {
      // Normal match resets perfect combo (optional, based on config)
      if (CONFIG.PERFECT_COMBO_RESET_ON_NORMAL) {
        this._resetPerfectCombo();
      }
    }

    // Successful match resets near miss chain
    this._resetNearMissChain();

    this.effects.spawnMatchParticles(
      npc.group.position.x,
      npc.group.position.y,
      npc.group.position.z,
      npc.shape
    );

    if (isPerfectMatch) {
      this.effects.spawnPerfectBurst(
        npc.group.position.x,
        npc.group.position.y,
        npc.group.position.z,
        npc.shape
      );
      this.effects.spawnPerfectCatchParticles(
        npc.group.position.x,
        npc.group.position.y,
        npc.group.position.z,
        npc.shape
      );
    }

    this.ui.updateStreak(this.streak);
    this.ui.updateCrowd(this.crowd.getCount());
    this.ui.onStreakIncrement(this.streak, isPerfectMatch);

    this.effects.spawnStreakBurst(
      npc.group.position.x,
      npc.group.position.y,
      npc.group.position.z,
      npc.shape,
      this.streak
    );

    this.effects.triggerCameraPunch(this.streak);
    this.effects.triggerLightingPulse(this.streak);
    this.crowd.bounceMembers(this.streak);

    if (isPerfectMatch) {
      this.effects.triggerPerfectCameraPunch();
    }

    // Flow Aura at 10, 20, 30... streak milestones
    if (this.streak > 0 && this.streak % CONFIG.FLOW_STREAK_THRESHOLD === 0) {
      this.effects.triggerFlowAura(this.player.mesh, this.player.currentShape);
      this.ui.showFlowActivation();
    }

    // Crowd formation milestones
    const crowdCount = this.crowd.getCount();
    if (CONFIG.CROWD_FORMATION_MILESTONES.includes(crowdCount)) {
      this.crowd.triggerFormationMilestone(crowdCount);
      this.ui.showCrowdFormation(crowdCount);
    }
  }

  _incrementPerfectCombo() {
    this.perfectCombo++;
    this.ui.showPerfectCombo(this.perfectCombo);

    if (this.perfectCombo === CONFIG.PERFECT_COMBO_THRESHOLD_3) {
      this.audio.playPerfectCombo3();
      this.ui.showPerfectComboMilestone('PERFECT COMBO!');
    } else if (this.perfectCombo === CONFIG.PERFECT_COMBO_THRESHOLD_5) {
      this.audio.playPerfectCombo5();
      this.ui.showPerfectComboMilestone('UNSTOPPABLE!');
    }
  }

  _resetPerfectCombo() {
    if (this.perfectCombo > 0) {
      this.perfectCombo = 0;
      this.ui.hidePerfectCombo();
    }
  }

  _onNearMiss(nearMiss) {
    const { type, entity } = nearMiss;
    const x = entity.group.position.x;
    const y = entity.group.position.y;
    const z = entity.group.position.z;

    if (type === 'barrier') {
      this.audio.playNearMiss();
      this.effects.spawnNearMissParticles(x, y, z, 'barrier');
      this.ui.showNearMiss('NEAR MISS!', false);
      this._incrementNearMissChain();
    } else if (type === 'mismatch') {
      this.audio.playNearMiss();
      this.effects.spawnNearMissParticles(x, y, z, 'npc');
      this.ui.showNearMiss('NEAR MISS!', false);
      this._incrementNearMissChain();
    }
  }

  _incrementNearMissChain() {
    this.nearMissChain++;
    this.nearMissChainTimer = CONFIG.NEAR_MISS_CHAIN_TIMEOUT;

    this.ui.showNearMissChain(this.nearMissChain);

    if (this.nearMissChain === CONFIG.NEAR_MISS_CHAIN_THRESHOLD_2) {
      this.ui.showNearMissChainMilestone('RISKY!');
    } else if (this.nearMissChain === CONFIG.NEAR_MISS_CHAIN_THRESHOLD_3) {
      this.ui.showNearMissChainMilestone('DANGEROUS!');
    }
  }

  _resetNearMissChain() {
    if (this.nearMissChain > 0) {
      this.nearMissChain = 0;
      this.nearMissChainTimer = 0;
      this.ui.hideNearMissChain();
    }
  }

  _onRivalDefeated(rival) {
    // Reward: add some of rival's crowd to player
    const reward = Math.min(rival.crowdSize, 3);
    for (let i = 0; i < reward; i++) {
      this.crowd.addMember(rival.shape);
    }

    this.ui.updateCrowd(this.crowd.getCount());
    this.ui.showRivalDefeated(reward);
    this.audio.playRivalDefeated();
    this.effects.spawnRivalDefeatedParticles(rival.group.position.x, rival.group.position.y, rival.group.position.z);
  }

  _checkPerfectMatch() {
    const timeSinceChange = (performance.now() - this.player.lastFormChangeTime) / 1000;
    return timeSinceChange <= CONFIG.PERFECT_MATCH_WINDOW && timeSinceChange > 0;
  }

  _gameOver() {
    this.audio.stopMusic();
    this.state = 'gameover';
    this.ui.hideHUD();
    this.ui.showGameOver(this.bestStreak, this.crowd.getCount());
  }

  _updateCamera() {
    const targetX = this.player.mesh.position.x * 0.3;
    this.camera.position.x += (targetX - this.camera.position.x) * 0.05;

    const shake = this.effects.getCameraShakeOffset();
    this.camera.position.x += shake.x;
    this.camera.position.y += shake.y;
  }

  _updateDebugOverlay() {
    if (CONFIG.DEBUG_COLLISION) {
      this.ui.updateDebugOverlay(this.collision.getDebugInfo());
    }
  }

  _gameLoop() {
    this.animFrameId = requestAnimationFrame(() => this._gameLoop());

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 16.667, 3);
    this.lastTime = now;

    this.frameCount++;

    if (this.state === 'playing') {
      this._updateSpeed();

      this.distanceTraveled += this.speed * dt;
      this.player.update();
      this.track.update(this.player.mesh.position.z);
      this.spawner.update(this.speed * dt, this.streak);
      this._handleCollisions();
      this.crowd.update(
        this.player.mesh.position.x,
        this.player.mesh.position.z,
        this.player.mesh,
        dt,
        this.track.getSurfaceY()
      );

      // Decrement near miss chain timer
      if (this.nearMissChainTimer > 0) {
        this.nearMissChainTimer--;
        if (this.nearMissChainTimer <= 0) {
          this._resetNearMissChain();
        }
      }

      this.effects.updateTrails(
        this.player.mesh.position.x,
        this.player.mesh.position.y,
        this.player.mesh.position.z,
        true
      );
      this.effects.updateLighting(this.streak, this.crowd.getCount());
      this.effects.updateMusicIntensity(this.streak);
      this.effects.updateBackground(this.player.mesh.position.z);
      this.effects.updateFlowAura(this.player.mesh, dt);
      this._updateDebugOverlay();
    } else {
      this.effects.updateBackground(0);
    }

    this.effects.updateParticles();
    this._updateCamera();

    this.renderer.render(this.scene, this.camera);
  }

  run() {
    this._gameLoop();
  }

  destroy() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    this.input.destroy();
    this.player.dispose();
    this.renderer.dispose();
  }
}