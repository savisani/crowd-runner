import { CONFIG } from '../engine/Config.js';
import { ShapeFactory } from '../engine/ShapeFactory.js';

export class Barrier {
  constructor() {
    this.group = null;
    this.active = false;
    this.lane = 0;
    this.processedThisFrame = false;
    this.prevZ = 0;
    this.nearMissTriggered = false;
  }

  init(scene, lane, zPos) {
    this.lane = lane;
    this.active = true;
    this.processedThisFrame = false;
    this.prevZ = zPos;
    this.nearMissTriggered = false;

    if (this.group) {
      if (this.group.parent) {
        scene.remove(this.group);
      }
    }

    this.group = ShapeFactory.createBarrier(lane);
    this.group.position.set(CONFIG.LANE_POSITIONS[lane], 0, zPos);

    if (!this.group.parent) {
      scene.add(this.group);
    }
  }

  update(speed) {
    if (!this.active) return;
    this.prevZ = this.group.position.z;
    this.group.position.z += speed;
  }

  deactivate(scene) {
    this.active = false;
    this.processedThisFrame = false;
    if (this.group && this.group.parent) {
      scene.remove(this.group);
    }
  }

  reset() {
    this.active = false;
    this.processedThisFrame = false;
    this.prevZ = 0;
    this.lane = 0;
  }
}
