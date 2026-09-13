import * as THREE from 'three';
import { CONFIG } from '../engine/Config.js';
import { ShapeFactory } from '../engine/ShapeFactory.js';

export class Rival {
  constructor() {
    this.group = new THREE.Group();
    this.runnerMesh = null;
    this.crowdMeshes = [];
    this.active = false;
    this.lane = 0;
    this.shape = 'circle';
    this.color = CONFIG.COLORS.circle;
    this.crowdSize = 0;
    this.maxCrowdSize = CONFIG.RIVAL_CROWD_SIZE;
    this.defeated = false;
    this.defeatTimer = 0;
    this.spawnZ = 0;
    this.targetZ = 0;
    this.perfectSequenceRequired = 3;
    this.perfectSequenceProgress = 0;
    this.interactionActive = false;
  }

  init(scene, lane, zPos, playerStreak) {
    this.lane = lane;
    this.active = true;
    this.defeated = false;
    this.defeatTimer = 0;
    this.perfectSequenceProgress = 0;
    this.interactionActive = false;
    this.spawnZ = zPos;
    this.targetZ = zPos - 15; // Rival stops 15 units ahead of spawn

    // Pick a random shape for the rival runner
    const shapes = CONFIG.SHAPES;
    this.shape = shapes[Math.floor(Math.random() * shapes.length)];
    this.color = CONFIG.COLORS[this.shape];

    // Rival crowd size based on player streak
    this.crowdSize = Math.min(CONFIG.RIVAL_CROWD_SIZE, 3 + Math.floor(playerStreak / 5));

    this._createRunner();
    this._createCrowd();

    const halfWidth = ShapeFactory.getNPCHalfWidth(this.shape);
    const maxCenterX = CONFIG.TRACK_INNER_BOUNDARY - CONFIG.NPC_WALL_CLEARANCE - halfWidth;
    const laneX = CONFIG.LANE_POSITIONS[lane];
    const clampedX = Math.max(-maxCenterX, Math.min(maxCenterX, laneX));

    this.group.position.set(clampedX, CONFIG.PLAYER_Y, zPos);

    if (!this.group.parent) {
      scene.add(this.group);
    }
  }

  _createRunner() {
    if (this.runnerMesh) {
      this.group.remove(this.runnerMesh);
    }

    this.runnerMesh = ShapeFactory.createShape(this.shape, this.color);
    this.runnerMesh.scale.setScalar(1.0); // Same size as player
    this.group.add(this.runnerMesh);

    // Add glow effect to distinguish rival
    const glowGeo = new THREE.RingGeometry(0.6, 0.8, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xff6b6b,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    this.glowMesh = new THREE.Mesh(glowGeo, glowMat);
    this.glowMesh.rotation.x = -Math.PI / 2;
    this.glowMesh.position.y = 0;
    this.runnerMesh.add(this.glowMesh);
  }

  _createCrowd() {
    // Remove existing crowd
    this.crowdMeshes.forEach(m => {
      this.group.remove(m);
      m.geometry.dispose();
      m.material.dispose();
    });
    this.crowdMeshes = [];

    // Create small crowd behind rival
    for (let i = 0; i < this.crowdSize; i++) {
      const shape = CONFIG.SHAPES[Math.floor(Math.random() * CONFIG.SHAPES.length)];
      const color = CONFIG.COLORS[shape];
      const mesh = ShapeFactory.createShape(shape, color, 0.35);

      // Position in a small V formation behind rival
      const row = Math.floor(i / 2);
      const col = i % 2;
      const xOffset = col === 0 ? -0.5 : 0.5;
      const zOffset = 1.5 + row * 0.8;

      mesh.position.set(xOffset, 0.3, zOffset);
      mesh.rotation.y = Math.PI;
      this.group.add(mesh);
      this.crowdMeshes.push(mesh);
    }
  }

  update(speed, playerZ) {
    if (!this.active || this.defeated) return;

    // Move toward target position
    if (this.group.position.z > this.targetZ) {
      this.group.position.z -= speed * 0.8; // Slower than player
    }

    // Animate runner
    this.runnerMesh.rotation.y += 0.04;
    this.runnerMesh.position.y = Math.sin(performance.now() * 0.005) * 0.1;

    // Animate glow
    if (this.glowMesh) {
      const pulse = Math.sin(performance.now() * 0.008) * 0.15 + 0.3;
      this.glowMesh.material.opacity = pulse;
      this.glowMesh.scale.setScalar(1 + Math.sin(performance.now() * 0.006) * 0.1);
    }

    // Animate crowd
    this.crowdMeshes.forEach((mesh, i) => {
      mesh.rotation.y += 0.02;
      mesh.position.y = 0.3 + Math.sin(performance.now() * 0.004 + i) * 0.05;
    });

    // Check if rival should despawn (passed player)
    if (this.group.position.z > CONFIG.DESPAWN_DISTANCE) {
      this.deactivate();
    }

    // Handle defeat sequence
    if (this.defeated) {
      this.defeatTimer++;
      if (this.defeatTimer > 120) { // 2 seconds
        this.deactivate();
      }
    }
  }

  startInteraction() {
    this.interactionActive = true;
    this.perfectSequenceProgress = 0;
  }

  recordPerfectMatch() {
    if (!this.interactionActive) return false;

    this.perfectSequenceProgress++;
    if (this.perfectSequenceProgress >= this.perfectSequenceRequired) {
      this.defeat();
      return true;
    }
    return false;
  }

  recordNormalMatch() {
    // Normal match resets the sequence
    if (this.interactionActive) {
      this.perfectSequenceProgress = 0;
    }
  }

  recordMismatch() {
    // Mismatch ends interaction
    this.interactionActive = false;
    this.perfectSequenceProgress = 0;
  }

  defeat() {
    this.defeated = true;
    this.defeatTimer = 0;
    this.interactionActive = false;

    // Visual defeat effect
    if (this.glowMesh) {
      this.glowMesh.material.color.setHex(0x4aff8a);
    }
    this.runnerMesh.material.color.setHex(0x4aff8a);
  }

  deactivate() {
    this.active = false;
    if (this.runnerMesh) {
      this.group.remove(this.runnerMesh);
      this.runnerMesh.geometry.dispose();
      this.runnerMesh.material.dispose();
      this.runnerMesh = null;
    }
    this.crowdMeshes.forEach(m => {
      this.group.remove(m);
      m.geometry.dispose();
      m.material.dispose();
    });
    this.crowdMeshes = [];
    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
  }

  reset() {
    this.active = false;
    this.defeated = false;
    this.lane = 0;
    this.shape = 'circle';
    this.color = CONFIG.COLORS.circle;
    this.crowdSize = 0;
    this.perfectSequenceProgress = 0;
    this.interactionActive = false;
  }

  getDistanceToPlayer(playerZ) {
    return Math.abs(this.group.position.z - playerZ);
  }

  isInInteractionRange(playerZ) {
    return this.getDistanceToPlayer(playerZ) < 20;
  }
}