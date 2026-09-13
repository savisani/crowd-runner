import * as THREE from 'three';
import { CONFIG } from './Config.js';

const geometryCache = {
  circle: null,
  triangle: null,
  square: null,
  barrier: null
};

const npcHalfWidthCache = {};

function getCircleGeometry() {
  if (!geometryCache.circle) {
    geometryCache.circle = new THREE.SphereGeometry(CONFIG.PLAYER_SIZE, 12, 8);
  }
  return geometryCache.circle;
}

function getTriangleGeometry() {
  if (!geometryCache.triangle) {
    const shape = new THREE.Shape();
    const s = CONFIG.PLAYER_SIZE;
    shape.moveTo(0, s * 1.1);
    shape.lineTo(-s * 0.95, -s * 0.6);
    shape.lineTo(s * 0.95, -s * 0.6);
    shape.closePath();
    const extrudeSettings = { depth: s * 0.7, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2 };
    geometryCache.triangle = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometryCache.triangle.center();
  }
  return geometryCache.triangle;
}

function getSquareGeometry() {
  if (!geometryCache.square) {
    geometryCache.square = new THREE.BoxGeometry(CONFIG.PLAYER_SIZE * 1.5, CONFIG.PLAYER_SIZE * 1.5, CONFIG.PLAYER_SIZE * 1.5);
  }
  return geometryCache.square;
}

function getBarrierGeometry() {
  if (!geometryCache.barrier) {
    geometryCache.barrier = new THREE.BoxGeometry(CONFIG.LANE_WIDTH * 0.8, CONFIG.BARRIER_COLLISION_HEIGHT, 0.6);
  }
  return geometryCache.barrier;
}

function getGeometry(shape) {
  switch (shape) {
    case 'circle': return getCircleGeometry();
    case 'triangle': return getTriangleGeometry();
    case 'square': return getSquareGeometry();
    default: return getCircleGeometry();
  }
}

function computeNPCHalfWidth(shape) {
  if (npcHalfWidthCache[shape]) return npcHalfWidthCache[shape];

  const geometry = getGeometry(shape);
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  let halfWidth = CONFIG.PLAYER_SIZE * 0.5;

  if (box) {
    halfWidth = (box.max.x - box.min.x) * 0.5 * CONFIG.NPC_VISUAL_SCALE;
  }

  npcHalfWidthCache[shape] = halfWidth;
  return halfWidth;
}

export class ShapeFactory {
  static createShape(shape, color, scale = 1) {
    const geometry = getGeometry(shape);
    const material = new THREE.MeshLambertMaterial({ color, flatShading: true });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.setScalar(scale);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  static createBarrier(lane) {
    const geometry = getBarrierGeometry();
    const material = new THREE.MeshLambertMaterial({ color: 0x888888, flatShading: true });
    const mesh = new THREE.Mesh(geometry, material);

    const group = new THREE.Group();
    group.add(mesh);

    const spikeMat = new THREE.MeshLambertMaterial({ color: 0xcccccc, flatShading: true });
    const spikeGeo = new THREE.ConeGeometry(0.15, 0.4, 4);

    for (let i = 0; i < 5; i++) {
      const spike = new THREE.Mesh(spikeGeo, spikeMat);
      spike.position.set(-0.3 + i * 0.15, CONFIG.BARRIER_COLLISION_HEIGHT * 0.5 + 0.1, 0);
      spike.rotation.x = -Math.PI / 2;
      group.add(spike);
    }

    return group;
  }

  static createFace(isAngry = true) {
    const group = new THREE.Group();
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });

    const eyeGeo = new THREE.SphereGeometry(0.06, 6, 4);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.18, 0.12, 0.38);
    group.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.18, 0.12, 0.38);
    group.add(rightEye);

    if (isAngry) {
      const browGeo = new THREE.BoxGeometry(0.2, 0.04, 0.04);
      const leftBrow = new THREE.Mesh(browGeo, eyeMat);
      leftBrow.position.set(-0.18, 0.24, 0.38);
      leftBrow.rotation.z = 0.3;
      group.add(leftBrow);

      const rightBrow = new THREE.Mesh(browGeo, eyeMat);
      rightBrow.position.set(0.18, 0.24, 0.38);
      rightBrow.rotation.z = -0.3;
      group.add(rightBrow);

      const mouthGeo = new THREE.BoxGeometry(0.15, 0.04, 0.04);
      const mouth = new THREE.Mesh(mouthGeo, eyeMat);
      mouth.position.set(0, -0.02, 0.38);
      group.add(mouth);
    } else {
      const smileGeo = new THREE.TorusGeometry(0.08, 0.025, 6, 8, Math.PI);
      const smile = new THREE.Mesh(smileGeo, eyeMat);
      smile.position.set(0, -0.02, 0.38);
      smile.rotation.x = Math.PI;
      group.add(smile);
    }

    return group;
  }

  static getNPCHalfWidth(shape) {
    return computeNPCHalfWidth(shape);
  }

  static getMaxNPCHalfWidth() {
    return Math.max(
      computeNPCHalfWidth('circle'),
      computeNPCHalfWidth('triangle'),
      computeNPCHalfWidth('square')
    );
  }
}
