import * as THREE from 'three';
import { CONFIG } from '../engine/Config.js';
import { ShapeFactory } from '../engine/ShapeFactory.js';

export class Crowd {
  constructor(scene, track) {
    this.scene = scene;
    this.track = track;
    this.members = [];
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.formations = {
      normal: {
        rowSize: CONFIG.CROWD_ROW_SIZE,
        rowSpacing: CONFIG.CROWD_ROW_SPACING,
        firstRowZ: CONFIG.CROWD_FIRST_ROW_Z,
        lateralSpacing: CONFIG.CROWD_LATERAL_SPACING,
      },
      milestone10: {
        rowSize: CONFIG.CROWD_ROW_SIZE,
        rowSpacing: CONFIG.CROWD_ROW_SPACING * 0.85,
        firstRowZ: CONFIG.CROWD_FIRST_ROW_Z * 0.9,
        lateralSpacing: CONFIG.CROWD_LATERAL_SPACING * 0.9,
      },
      milestone25: {
        rowSize: CONFIG.CROWD_ROW_SIZE + 1,
        rowSpacing: CONFIG.CROWD_ROW_SPACING,
        firstRowZ: CONFIG.CROWD_FIRST_ROW_Z,
        lateralSpacing: CONFIG.CROWD_LATERAL_SPACING * 0.95,
      },
      milestone50: {
        rowSize: CONFIG.CROWD_ROW_SIZE + 2,
        rowSpacing: CONFIG.CROWD_ROW_SPACING * 0.9,
        firstRowZ: CONFIG.CROWD_FIRST_ROW_Z * 0.95,
        lateralSpacing: CONFIG.CROWD_LATERAL_SPACING * 0.85,
      }
    };

    this.currentFormation = 'normal';
    this.formationTimer = 0;
    this.formationDuration = 180;
    this.formationTransitioning = false;
    this.prevFormation = null;

    this.memberSmoothing = 7;
    this.laneSmoothing = 9;
    this.forwardRotation = Math.PI;

    this.visiblePool = [];
    this.visiblePoolSize = CONFIG.CROWD_VISIBLE_MAX;
    this._initVisiblePool();
  }

  _initVisiblePool() {
    const shapes = CONFIG.SHAPES;
    for (let i = 0; i < this.visiblePoolSize; i++) {
      const shape = shapes[i % shapes.length];
      const color = CONFIG.COLORS[shape];
      const mesh = ShapeFactory.createShape(shape, color, CONFIG.CROWD_FOLLOWER_SCALE);
      mesh.visible = false;
      mesh.userData.poolIndex = i;
      this.group.add(mesh);
      this.visiblePool.push({
        mesh,
        logicalIndex: -1,
        active: false,
        targetX: 0,
        targetY: 0,
        targetZ: 0,
        jitterX: 0,
        jitterZ: 0,
        rotationOffset: 0,
        bounceTimer: 0,
        bounceIntensity: 0,
        bounceDuration: 0,
      });
    }
  }

  triggerFormationMilestone(count) {
    let formationKey = null;
    if (count === 10) formationKey = 'milestone10';
    else if (count === 25) formationKey = 'milestone25';
    else if (count === 50) formationKey = 'milestone50';

    if (formationKey && this.formations[formationKey]) {
      this._transitionToFormation(formationKey);
    }
  }

  _transitionToFormation(formationKey) {
    if (this.currentFormation === formationKey) return;
    this.prevFormation = this.currentFormation;
    this.currentFormation = formationKey;
    this.formationTimer = this.formationDuration;
    this.formationTransitioning = true;
  }

  _updateFormation(dt) {
    if (!this.formationTransitioning) return;
    this.formationTimer -= dt * 60;
    if (this.formationTimer <= 0) {
      this.currentFormation = 'normal';
      this.formationTransitioning = false;
      this.prevFormation = null;
    }
  }

  _getFormationConfig() {
    return this.formations[this.currentFormation] || this.formations.normal;
  }

  _getFormationSlots(count) {
    const cfg = this._getFormationConfig();
    const slots = [];
    let remaining = count;
    let row = 0;

    while (remaining > 0) {
      const rowSize = Math.min(cfg.rowSize, remaining);
      const rowZ = cfg.firstRowZ + row * cfg.rowSpacing;
      const rowOffset = -(rowSize - 1) * cfg.lateralSpacing * 0.5;

      for (let col = 0; col < rowSize; col++) {
        slots.push({
          x: rowOffset + col * cfg.lateralSpacing,
          z: rowZ,
        });
      }

      remaining -= rowSize;
      row++;
    }

    return slots;
  }

  update(playerX, playerZ, playerMesh, dt = 1, trackSurfaceY) {
    const frameDt = Math.max(0.0001, dt);
    const laneBlend = 1 - Math.exp(-this.laneSmoothing * frameDt);
    const memberBlend = 1 - Math.exp(-this.memberSmoothing * frameDt);
    const surfaceY = this._getTrackSurfaceY(trackSurfaceY);

    this._updateFormation(frameDt);

    this.group.position.x += (playerX - this.group.position.x) * laneBlend;
    this.group.position.y = 0;
    this.group.position.z = playerZ;

    const slots = this._getFormationSlots(this.members.length);

    const visibleIndices = [];
    for (let i = 0; i < this.members.length; i++) {
      const memberData = this.members[i];
      const slot = slots[i];
      if (!slot) continue;

      const worldZ = playerZ + slot.z;
      const isVisible = worldZ > playerZ - 2 && worldZ < playerZ + 25;

      if (isVisible && visibleIndices.length < this.visiblePoolSize) {
        visibleIndices.push(i);
      }
    }

    for (let p = 0; p < this.visiblePoolSize; p++) {
      const poolEntry = this.visiblePool[p];
      if (p < visibleIndices.length) {
        const i = visibleIndices[p];
        const memberData = this.members[i];
        const slot = slots[i];

        poolEntry.mesh.visible = true;
        poolEntry.logicalIndex = i;
        poolEntry.active = true;

        const targetX = slot.x + memberData.jitterX;
        const targetY = surfaceY + this._getHalfHeight(poolEntry.mesh);
        const targetZ = slot.z + memberData.jitterZ;

        let yOffset = 0;
        if (memberData.bounceTimer > 0 && memberData.bounceIntensity) {
          const bounceProgress = memberData.bounceTimer / memberData.bounceDuration;
          yOffset = memberData.bounceIntensity * Math.sin(bounceProgress * Math.PI);
          memberData.bounceTimer--;
        }

        poolEntry.mesh.position.x += (targetX - poolEntry.mesh.position.x) * memberBlend;
        poolEntry.mesh.position.y += (targetY + yOffset - poolEntry.mesh.position.y) * memberBlend;
        poolEntry.mesh.position.z += (targetZ - poolEntry.mesh.position.z) * memberBlend;

        const targetRotation = this.forwardRotation + memberData.rotationOffset;
        let rotationDelta = targetRotation - poolEntry.mesh.rotation.y;
        rotationDelta = ((rotationDelta + Math.PI) % (Math.PI * 2)) - Math.PI;
        poolEntry.mesh.rotation.y += rotationDelta * memberBlend;

        if (poolEntry.mesh.material.color.getHex() !== CONFIG.COLORS[memberData.shape]) {
          poolEntry.mesh.material.color.setHex(CONFIG.COLORS[memberData.shape]);
        }
      } else {
        poolEntry.mesh.visible = false;
        poolEntry.active = false;
        poolEntry.logicalIndex = -1;
      }
    }
  }

  addMember(shape) {
    if (this.members.length >= CONFIG.MAX_CROWD) return false;

    const jitterX = (Math.random() - 0.5) * 0.2;
    const jitterZ = (Math.random() - 0.5) * 0.12;
    const rotationOffset = (Math.random() - 0.5) * 0.18;

    this.members.push({
      shape,
      jitterX,
      jitterZ,
      rotationOffset,
      bounceTimer: 0,
      bounceIntensity: 0,
      bounceDuration: 0,
    });

    return true;
  }

  removeMembers(count) {
    const toRemove = Math.min(count, this.members.length);
    this.members.splice(this.members.length - toRemove, toRemove);
    return toRemove;
  }

  getMembersToRemove(count) {
    return Math.min(count, this.members.length);
  }

  bounceMembers(streak) {
    const intensity = streak >= 10 ? 0.3 : streak === 5 ? 0.2 : 0.1;
    const duration = streak >= 10 ? 12 : streak === 5 ? 10 : 6;

    for (const member of this.members) {
      member.bounceIntensity = intensity;
      member.bounceDuration = duration;
      member.bounceTimer = duration;
    }
  }

  getCount() {
    return this.members.length;
  }

  reset() {
    this.members = [];
    this.group.position.set(0, 0, 0);
    this.currentFormation = 'normal';
    this.formationTimer = 0;
    this.formationTransitioning = false;
    this.prevFormation = null;

    for (const poolEntry of this.visiblePool) {
      poolEntry.mesh.visible = false;
      poolEntry.active = false;
      poolEntry.logicalIndex = -1;
    }
  }

  _getTrackSurfaceY(trackSurfaceY) {
    if (typeof trackSurfaceY === 'number' && Number.isFinite(trackSurfaceY)) {
      return trackSurfaceY;
    }
    if (this.track && typeof this.track.getSurfaceY === 'function') {
      return this.track.getSurfaceY();
    }
    return 0;
  }

  _getHalfHeight(mesh) {
    if (!mesh.geometry) return CONFIG.CROWD_FOLLOWER_SCALE;
    mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox;
    if (!box) return CONFIG.CROWD_FOLLOWER_SCALE;
    const scaledHeight = (box.max.y - box.min.y) * Math.abs(mesh.scale.y);
    return scaledHeight * 0.5;
  }
}
