import * as THREE from 'three';
import { CONFIG } from '../engine/Config.js';
import { ShapeFactory } from '../engine/ShapeFactory.js';

export class Player {
  constructor(scene) {
    this.scene = scene;
    this.lane = CONFIG.PLAYER_START_LANE;
    this.targetX = CONFIG.LANE_POSITIONS[this.lane];
    this.mesh = null;
    this.shapeIndex = 0;
    this.currentShape = CONFIG.SHAPES[0];
    this.currentColor = CONFIG.COLORS[this.currentShape];

    this.isJumping = false;
    this.velocityY = 0;
    this.baseY = CONFIG.PLAYER_Y;

    this.switchCooldown = 0;

    this.prevX = this.targetX;
    this.prevY = this.baseY;
    this.prevZ = 0;

    this.lastFormChangeTime = 0;
    this._pulseTimer = 0;

    this._createMesh();
  }

  _createMesh() {
    if (this.mesh) {
      this.scene.remove(this.mesh);
    }

    this.mesh = ShapeFactory.createShape(this.currentShape, this.currentColor);
    this.mesh.position.set(this.targetX, this.baseY, 0);
    this.scene.add(this.mesh);
  }

  cycleShape() {
    if (this.switchCooldown > 0) return null;

    this.shapeIndex = (this.shapeIndex + 1) % CONFIG.SHAPES.length;
    this.currentShape = CONFIG.SHAPES[this.shapeIndex];
    this.currentColor = CONFIG.COLORS[this.currentShape];

    this.lastFormChangeTime = performance.now();
    this._createMesh();
    this.switchCooldown = 8;
    this._pulseTimer = 10;

    return this.currentShape;
  }

  switchLane(direction) {
    const newLane = this.lane + direction;
    if (newLane < 0 || newLane >= CONFIG.LANE_POSITIONS.length) return false;
    this.lane = newLane;
    this.targetX = CONFIG.LANE_POSITIONS[this.lane];
    return true;
  }

  jump() {
    if (this.isJumping) return false;
    this.isJumping = true;
    this.velocityY = CONFIG.JUMP_FORCE;
    return true;
  }

  getWorldPosition() {
    return this.mesh.position;
  }

  update() {
    if (this.switchCooldown > 0) this.switchCooldown--;

    this.prevX = this.mesh.position.x;
    this.prevY = this.mesh.position.y;
    this.prevZ = this.mesh.position.z;

    const dx = this.targetX - this.mesh.position.x;
    if (Math.abs(dx) > 0.01) {
      this.mesh.position.x += dx * CONFIG.PLAYER_SWITCH_SPEED * 0.016;
    } else {
      this.mesh.position.x = this.targetX;
    }

    if (this.isJumping) {
      this.mesh.position.y += this.velocityY;
      this.velocityY -= CONFIG.GRAVITY;
      if (this.mesh.position.y <= this.baseY) {
        this.mesh.position.y = this.baseY;
        this.isJumping = false;
        this.velocityY = 0;
      }
    }

    if (this._pulseTimer > 0) {
      this._pulseTimer--;
      const s = 1.0 + 0.15 * (this._pulseTimer / 10);
      this.mesh.scale.setScalar(s);
    } else {
      this.mesh.scale.setScalar(1.0);
    }

    this.mesh.rotation.y += 0.03;
  }

  isJumpingOver(colliderHeight) {
    if (!this.isJumping) return false;
    return this.mesh.position.y > colliderHeight;
  }

  reset() {
    this.lane = CONFIG.PLAYER_START_LANE;
    this.targetX = CONFIG.LANE_POSITIONS[this.lane];
    this.shapeIndex = 0;
    this.currentShape = CONFIG.SHAPES[0];
    this.currentColor = CONFIG.COLORS[this.currentShape];
    this.isJumping = false;
    this.velocityY = 0;
    this.mesh.position.set(this.targetX, this.baseY, 0);
    this.prevX = this.targetX;
    this.prevY = this.baseY;
    this.prevZ = 0;
    this.switchCooldown = 0;
    this._pulseTimer = 0;
    this.lastFormChangeTime = 0;
    this._createMesh();
  }

  dispose() {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
    }
  }
}
