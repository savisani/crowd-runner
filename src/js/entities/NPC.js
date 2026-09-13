import * as THREE from 'three';
import { CONFIG } from '../engine/Config.js';
import { ShapeFactory } from '../engine/ShapeFactory.js';

export class NPC {
  constructor() {
    this.group = new THREE.Group();
    this.mesh = null;
    this.face = null;
    this.shape = null;
    this.color = null;
    this.active = false;
    this.lane = 0;
    this.isAngry = true;
    this.bobPhase = Math.random() * Math.PI * 2;
    this.processedThisFrame = false;
    this.prevZ = 0;
    this.targetType = 'safe';
    this.crowdReward = 1;
    this.labelMesh = null;
    this.isMoving = false;
    this.moveTargetLane = null;
    this.moveProgress = 0;
    this.moveStartX = 0;
    this.moveDuration = 0;
    this.moveTimer = 0;
    this.telegraphTimer = 0;
    this.hasTelegraphed = false;
    this.isPerfectCatch = false;
    this.nearMissTriggered = false;
  }

  init(scene, shape, lane, zPos, targetType = 'safe', crowdReward = 1) {
    this.shape = shape;
    this.color = CONFIG.COLORS[shape];
    this.lane = lane;
    this.active = true;
    this.isAngry = true;
    this.processedThisFrame = false;
    this.prevZ = zPos;
    this.targetType = targetType;
    this.crowdReward = crowdReward;
    this.isMoving = false;
    this.moveTargetLane = null;
    this.moveProgress = 0;
    this.telegraphTimer = 0;
    this.hasTelegraphed = false;
    this.isPerfectCatch = false;
    this.nearMissTriggered = false;

    if (this.mesh) {
      this.group.remove(this.mesh);
    }

    this.mesh = ShapeFactory.createShape(shape, this.color);
    this.mesh.scale.setScalar(CONFIG.NPC_VISUAL_SCALE);
    this.group.add(this.mesh);

    if (this.face) {
      this.group.remove(this.face);
    }
    this.face = ShapeFactory.createFace(true);
    this.mesh.add(this.face);

    const halfWidth = ShapeFactory.getNPCHalfWidth(shape);
    const maxCenterX = CONFIG.TRACK_INNER_BOUNDARY - CONFIG.NPC_WALL_CLEARANCE - halfWidth;
    const laneX = CONFIG.LANE_POSITIONS[lane];
    const clampedX = Math.max(-maxCenterX, Math.min(maxCenterX, laneX));

    this.group.position.set(clampedX, CONFIG.PLAYER_Y, zPos);

    this._createLabel(scene);

    if (!this.group.parent) {
      scene.add(this.group);
    }
  }

  _createLabel(scene) {
    if (this.labelMesh) {
      this.group.remove(this.labelMesh);
      if (this.labelMesh.geometry) this.labelMesh.geometry.dispose();
      if (this.labelMesh.material) this.labelMesh.material.dispose();
    }

    const isRisk = this.targetType === 'risk';
    const labelText = isRisk ? '+3' : '+1';
    const labelColor = isRisk ? 0xff4a6a : 0x4aff8a;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 64;
    canvas.height = 32;
    context.font = 'bold 20px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = isRisk ? '#ff4a6a' : '#4aff8a';
    context.strokeStyle = '#000000';
    context.lineWidth = 4;
    context.strokeText(labelText, 32, 16);
    context.fillText(labelText, 32, 16);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false
    });

    this.labelMesh = new THREE.Sprite(spriteMaterial);
    this.labelMesh.scale.set(1.2, 0.6, 1);
    this.labelMesh.position.set(0, 1.3, 0);
    this.labelMesh.renderOrder = 10;
    this.group.add(this.labelMesh);

    if (isRisk) {
      this.labelMesh.material.opacity = 0.9;
      this._animateRiskLabel();
    }
  }

  _animateRiskLabel() {
    if (!this.labelMesh || !this.active) return;
    const time = performance.now() * 0.005;
    this.labelMesh.scale.y = 0.6 + Math.sin(time * 3) * 0.1;
    this.labelMesh.material.opacity = 0.7 + Math.sin(time * 4) * 0.2;
    requestAnimationFrame(() => this._animateRiskLabel());
  }

  makeHappy() {
    this.isAngry = false;
    if (this.face) {
      this.mesh.remove(this.face);
    }
    this.face = ShapeFactory.createFace(false);
    this.mesh.add(this.face);
  }

  update(speed) {
    if (!this.active) return;

    this.prevZ = this.group.position.z;
    this.group.position.z += speed;
    this.bobPhase += 0.08;
    this.mesh.position.y = Math.sin(this.bobPhase) * 0.08;
    this.mesh.rotation.y += 0.04;

    if (this.isMoving && this.moveTargetLane !== null) {
      this.moveTimer += speed;
      const progress = Math.min(this.moveTimer / this.moveDuration, 1);
      this.moveProgress = this._easeInOutCubic(progress);

      const startX = this.moveStartX;
      const targetX = CONFIG.LANE_POSITIONS[this.moveTargetLane];
      const halfWidth = ShapeFactory.getNPCHalfWidth(this.shape);
      const maxCenterX = CONFIG.TRACK_INNER_BOUNDARY - CONFIG.NPC_WALL_CLEARANCE - halfWidth;
      const clampedTargetX = Math.max(-maxCenterX, Math.min(maxCenterX, targetX));

      this.group.position.x = startX + (clampedTargetX - startX) * this.moveProgress;

      if (progress >= 1) {
        this.isMoving = false;
        this.lane = this.moveTargetLane;
        this.moveTargetLane = null;
        this.moveProgress = 0;
        this.group.position.x = clampedTargetX;
      }
    }

    if (this.telegraphTimer > 0) {
      this.telegraphTimer -= speed;
      const telegraphProgress = 1 - this.telegraphTimer / 30;
      const telegraphAmount = Math.sin(telegraphProgress * Math.PI) * 0.15;
      const baseX = this.isMoving ? this.group.position.x : CONFIG.LANE_POSITIONS[this.lane];
      const targetLaneX = this.moveTargetLane !== null ? CONFIG.LANE_POSITIONS[this.moveTargetLane] : baseX;
      const direction = targetLaneX > baseX ? 1 : -1;
      this.mesh.position.x = direction * telegraphAmount;
    } else if (this.mesh.position.x !== 0) {
      this.mesh.position.x *= 0.9;
      if (Math.abs(this.mesh.position.x) < 0.01) this.mesh.position.x = 0;
    }
  }

  _easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  startMove(targetLane, moveStartDistance, moveDuration = 25) {
    if (this.isMoving) return false;
    if (targetLane === this.lane) return false;
    if (Math.abs(targetLane - this.lane) !== 1) return false;

    this.isMoving = true;
    this.moveTargetLane = targetLane;
    this.moveStartX = this.group.position.x;
    this.moveDuration = moveDuration;
    this.moveTimer = 0;
    this.moveProgress = 0;
    this.telegraphTimer = 30;
    this.hasTelegraphed = false;

    return true;
  }

  cancelMove() {
    if (!this.isMoving) return;
    this.isMoving = false;
    this.moveTargetLane = null;
    this.moveProgress = 0;
    this.moveTimer = 0;
    this.telegraphTimer = 0;
    this.group.position.x = CONFIG.LANE_POSITIONS[this.lane];
    const halfWidth = ShapeFactory.getNPCHalfWidth(this.shape);
    const maxCenterX = CONFIG.TRACK_INNER_BOUNDARY - CONFIG.NPC_WALL_CLEARANCE - halfWidth;
    const clampedX = Math.max(-maxCenterX, Math.min(maxCenterX, this.group.position.x));
    this.group.position.x = clampedX;
  }

  getCurrentLane() {
    if (this.isMoving && this.moveTargetLane !== null) {
      return this.moveProgress > 0.5 ? this.moveTargetLane : this.lane;
    }
    return this.lane;
  }

  deactivate(scene) {
    this.active = false;
    this.processedThisFrame = false;
    if (this.labelMesh) {
      this.group.remove(this.labelMesh);
      if (this.labelMesh.material.map) this.labelMesh.material.map.dispose();
      this.labelMesh.material.dispose();
      this.labelMesh = null;
    }
    if (this.group.parent) {
      scene.remove(this.group);
    }
  }

  reset() {
    this.active = false;
    this.isAngry = true;
    this.shape = null;
    this.color = null;
    this.lane = 0;
    this.processedThisFrame = false;
    this.prevZ = 0;
    this.targetType = 'safe';
    this.crowdReward = 1;
    this.isPerfectCatch = false;
    this.nearMissTriggered = false;
    this.bobPhase = Math.random() * Math.PI * 2;
    if (this.mesh) {
      this.mesh.position.y = 0;
      this.mesh.rotation.set(0, 0, 0);
      this.mesh.scale.setScalar(1);
      if (this.face) {
        this.mesh.remove(this.face);
      }
      this.face = null;
    }
    if (this.labelMesh) {
      this.group.remove(this.labelMesh);
      if (this.labelMesh.material.map) this.labelMesh.material.map.dispose();
      this.labelMesh.material.dispose();
      this.labelMesh = null;
    }
  }
}
