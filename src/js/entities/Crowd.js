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

    this.rowSizes = [1, 2, 3, 2, 3];
    this.rowLaneIndices = [
      [1],
      [0, 2],
      [0, 1, 2],
      [0, 2],
      [0, 1, 2]
    ];

    // Formation presets for milestones
    this.formations = {
      normal: {
        rowLaneIndices: [
          [1],
          [0, 2],
          [0, 1, 2],
          [0, 2],
          [0, 1, 2]
        ],
        rowSpacing: 1.4,
        firstRowZ: 1.5,
        lateralSpread: 1.0
      },
      milestone10: { // Tight V / wedge
        rowLaneIndices: [
          [1],
          [1],
          [0, 2],
          [0, 1, 2],
          [0, 1, 2]
        ],
        rowSpacing: 1.2,
        firstRowZ: 1.3,
        lateralSpread: 0.8
      },
      milestone25: { // Wider formation
        rowLaneIndices: [
          [1],
          [0, 2],
          [0, 1, 2],
          [0, 1, 2],
          [0, 1, 2],
          [0, 1, 2]
        ],
        rowSpacing: 1.5,
        firstRowZ: 1.6,
        lateralSpread: 1.2
      },
      milestone50: { // Large organized formation
        rowLaneIndices: [
          [1],
          [0, 2],
          [0, 1, 2],
          [0, 1, 2],
          [0, 1, 2],
          [0, 1, 2],
          [0, 1, 2],
          [0, 1, 2]
        ],
        rowSpacing: 1.3,
        firstRowZ: 1.4,
        lateralSpread: 1.0
      }
    };

    this.currentFormation = 'normal';
    this.formationTimer = 0;
    this.formationDuration = 180; // 3 seconds at 60fps
    this.formationTransitioning = false;
    this.prevFormation = null;

    this.maxMemberDepth = CONFIG.PLAYER_SIZE * 2 * 0.45;
    this.rowSpacing = Math.max(1.05, this.maxMemberDepth + 0.55);
    this.firstRowZ = Math.max(1.5, this.maxMemberDepth + 0.85);
    this.rearSpawnOffset = this.rowSpacing * 2.1;
    this.memberSmoothing = 7;
    this.laneSmoothing = 9;
    this.forwardRotation = Math.PI;
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

    // Apply new formation parameters immediately for slot calculation
    const formation = this.formations[formationKey];
    this.rowLaneIndices = formation.rowLaneIndices;
    this.rowSpacing = formation.rowSpacing;
    this.firstRowZ = formation.firstRowZ;

    // Recalculate member slots for smooth transition
    const slots = this._getFormationSlots(this.members.length);
    this.members.forEach((member, i) => {
      if (slots[i]) {
        member.userData.targetX = slots[i].x + member.userData.jitterX;
        member.userData.targetZ = slots[i].z + member.userData.jitterZ;
      }
    });
  }

  _updateFormation(dt) {
    if (!this.formationTransitioning) return;

    this.formationTimer -= dt * 60;
    if (this.formationTimer <= 0) {
      // Transition back to normal formation
      this.currentFormation = 'normal';
      this.formationTransitioning = false;
      this.prevFormation = null;

      const normalFormation = this.formations.normal;
      this.rowLaneIndices = normalFormation.rowLaneIndices;
      this.rowSpacing = normalFormation.rowSpacing;
      this.firstRowZ = normalFormation.firstRowZ;

      // Recalculate slots
      const slots = this._getFormationSlots(this.members.length);
      this.members.forEach((member, i) => {
        if (slots[i]) {
          member.userData.targetX = slots[i].x + member.userData.jitterX;
          member.userData.targetZ = slots[i].z + member.userData.jitterZ;
        }
      });
    }
  }

  update(playerX, playerZ, playerMesh, dt = 1, trackSurfaceY) {
    const frameDt = Math.max(0.0001, dt);
    const laneBlend = 1 - Math.exp(-this.laneSmoothing * frameDt);
    const memberBlend = 1 - Math.exp(-this.memberSmoothing * frameDt);
    const surfaceY = this._getTrackSurfaceY(trackSurfaceY);
    const slots = this._getFormationSlots(this.members.length);

    this._updateFormation(frameDt);

    this.group.position.x += (playerX - this.group.position.x) * laneBlend;
    this.group.position.y = 0;
    this.group.position.z = playerZ;

    for (let i = 0; i < this.members.length; i++) {
      const member = this.members[i];
      const ud = member.userData;
      const slot = slots[i];

      ud.targetX = slot.x + ud.jitterX;
      ud.targetY = surfaceY + this._getHalfHeight(member);
      ud.targetZ = slot.z + ud.jitterZ;

      let yOffset = 0;
      if (ud.bounceTimer > 0 && ud.bounceIntensity) {
        const bounceProgress = ud.bounceTimer / ud.bounceDuration;
        yOffset = ud.bounceIntensity * Math.sin(bounceProgress * Math.PI);
        ud.bounceTimer--;
      }

      const effectiveTargetY = ud.targetY + yOffset;

      member.position.x += (ud.targetX - member.position.x) * memberBlend;
      member.position.y += (effectiveTargetY - member.position.y) * memberBlend;
      member.position.z += (ud.targetZ - member.position.z) * memberBlend;

      const targetRotation = this.forwardRotation + ud.rotationOffset;
      let rotationDelta = targetRotation - member.rotation.y;
      rotationDelta = ((rotationDelta + Math.PI) % (Math.PI * 2)) - Math.PI;
      member.rotation.y += rotationDelta * memberBlend;
    }
  }

  addMember(shape) {
    if (this.members.length >= CONFIG.MAX_CROWD) return false;

    const color = CONFIG.COLORS[shape];
    const mesh = ShapeFactory.createShape(shape, color, 0.45);
    const slotIndex = this.members.length;
    const slots = this._getFormationSlots(this.members.length + 1);
    const slot = slots[slotIndex];
    const jitterX = (Math.random() - 0.5) * 0.24;
    const jitterZ = (Math.random() - 0.5) * 0.16;
    const rotationOffset = (Math.random() - 0.5) * 0.22;
    const groundY = this._getGroundY(mesh);
    const targetX = slot.x + jitterX;
    const targetZ = slot.z + jitterZ;

    mesh.position.set(
      targetX,
      groundY,
      targetZ + this.rearSpawnOffset
    );
    mesh.rotation.set(0, this.forwardRotation + rotationOffset, 0);
    mesh.userData = {
      slotIndex,
      jitterX,
      jitterZ,
      rotationOffset,
      targetX,
      targetY: groundY,
      targetZ,
      bounceTimer: 0,
      bounceIntensity: 0,
      bounceDuration: 0
    };

    this.group.add(mesh);
    this.members.push(mesh);
    return true;
  }

  removeMembers(count) {
    const toRemove = Math.min(count, this.members.length);
    for (let i = 0; i < toRemove; i++) {
      const member = this.members.pop();
      if (member) {
        this._disposeMember(member);
      }
    }
    return toRemove;
  }

  getMembersToRemove(count) {
    return Math.min(count, this.members.length);
  }

  update(playerX, playerZ, playerMesh, dt = 1, trackSurfaceY) {
    const frameDt = Math.max(0.0001, dt);
    const laneBlend = 1 - Math.exp(-this.laneSmoothing * frameDt);
    const memberBlend = 1 - Math.exp(-this.memberSmoothing * frameDt);
    const surfaceY = this._getTrackSurfaceY(trackSurfaceY);
    const slots = this._getFormationSlots(this.members.length);

    this.group.position.x += (playerX - this.group.position.x) * laneBlend;
    this.group.position.y = 0;
    this.group.position.z = playerZ;

    for (let i = 0; i < this.members.length; i++) {
      const member = this.members[i];
      const ud = member.userData;
      const slot = slots[i];

      ud.targetX = slot.x + ud.jitterX;
      ud.targetY = surfaceY + this._getHalfHeight(member);
      ud.targetZ = slot.z + ud.jitterZ;

      let yOffset = 0;
      if (ud.bounceTimer > 0 && ud.bounceIntensity) {
        const bounceProgress = ud.bounceTimer / ud.bounceDuration;
        yOffset = ud.bounceIntensity * Math.sin(bounceProgress * Math.PI);
        ud.bounceTimer--;
      }

      const effectiveTargetY = ud.targetY + yOffset;

      member.position.x += (ud.targetX - member.position.x) * memberBlend;
      member.position.y += (effectiveTargetY - member.position.y) * memberBlend;
      member.position.z += (ud.targetZ - member.position.z) * memberBlend;

      const targetRotation = this.forwardRotation + ud.rotationOffset;
      let rotationDelta = targetRotation - member.rotation.y;
      rotationDelta = ((rotationDelta + Math.PI) % (Math.PI * 2)) - Math.PI;
      member.rotation.y += rotationDelta * memberBlend;
    }
  }

  bounceMembers(streak) {
    const intensity = streak >= 10 ? 0.3 : streak === 5 ? 0.2 : 0.1;
    const duration = streak >= 10 ? 12 : streak === 5 ? 10 : 6;

    for (const member of this.members) {
      member.userData.bounceIntensity = intensity;
      member.userData.bounceDuration = duration;
      member.userData.bounceTimer = duration;
      member.userData.baseY = member.userData.targetY;
    }
  }

  getCount() {
    return this.members.length;
  }

  reset() {
    this.members.forEach(member => {
      member.userData.bounceTimer = 0;
      member.userData.bounceIntensity = 0;
      member.userData.bounceDuration = 0;
      this._disposeMember(member);
    });
    this.members = [];
    this.group.position.set(0, 0, 0);
  }

  _getFormationSlots(count) {
    const slots = [];
    let remaining = count;
    let row = 0;

    while (remaining > 0) {
      const rowPattern = row % this.rowLaneIndices.length;
      const laneIndices = this.rowLaneIndices[rowPattern];
      const rowSize = Math.min(laneIndices.length, remaining);
      const rowZ = this.firstRowZ + row * this.rowSpacing;

      for (let col = 0; col < rowSize; col++) {
        slots.push({
          x: CONFIG.LANE_POSITIONS[laneIndices[col]],
          z: rowZ
        });
      }

      remaining -= rowSize;
      row++;
    }

    return slots;
  }

  _getGroundY(mesh) {
    return this._getTrackSurfaceY() + this._getHalfHeight(mesh);
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

  _getHalfHeight(member) {
    member.geometry.computeBoundingBox();
    const box = member.geometry.boundingBox;
    if (!box) return CONFIG.PLAYER_SIZE * 0.45;

    const scaledHeight = (box.max.y - box.min.y) * Math.abs(member.scale.y);
    return scaledHeight * 0.5;
  }

  _disposeMember(member) {
    if (member.parent) {
      member.parent.remove(member);
    }
    member.material.dispose();
  }
}
