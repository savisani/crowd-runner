import * as THREE from 'three';
import { CONFIG } from '../engine/Config.js';

export class Track {
  constructor(scene) {
    this.scene = scene;
    this.segments = [];
    this.segmentLength = CONFIG.TRACK_SEGMENT_LENGTH;
    this.nextSegmentZ = 0;
    this._surfacePosition = new THREE.Vector3();
    this._createInitialTrack();
  }

  _createInitialTrack() {
    for (let i = 0; i < CONFIG.TRACK_VISIBLE_SEGMENTS; i++) {
      this._addSegment();
    }
  }

  _addSegment() {
    const group = new THREE.Group();
    group.position.z = this.nextSegmentZ;

    const trackGeo = new THREE.PlaneGeometry(CONFIG.TRACK_WIDTH, this.segmentLength);
    const trackMat = new THREE.MeshLambertMaterial({
      color: CONFIG.TRACK_COLOR,
      side: THREE.DoubleSide
    });
    const trackMesh = new THREE.Mesh(trackGeo, trackMat);
    trackMesh.rotation.x = -Math.PI / 2;
    trackMesh.position.y = -0.01;
    trackMesh.receiveShadow = true;
    group.add(trackMesh);

    const lineGeo = new THREE.PlaneGeometry(0.08, this.segmentLength);
    const lineMat = new THREE.MeshBasicMaterial({ color: CONFIG.LANE_LINE_COLOR, transparent: true, opacity: 0.5 });
    for (let i = 0; i < 2; i++) {
      const line = new THREE.Mesh(lineGeo, lineMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(CONFIG.LANE_POSITIONS[i] + CONFIG.LANE_WIDTH * 0.5, 0.01, 0);
      group.add(line);
    }

    const edgeGeo = new THREE.PlaneGeometry(0.15, this.segmentLength);
    const edgeMat = new THREE.MeshBasicMaterial({ color: 0x7c5cff, transparent: true, opacity: 0.35 });
    [-1, 1].forEach(side => {
      const edge = new THREE.Mesh(edgeGeo, edgeMat);
      edge.rotation.x = -Math.PI / 2;
      edge.position.set(side * (CONFIG.TRACK_WIDTH * 0.5 + 0.08), 0.02, 0);
      edge.renderOrder = -1;
      group.add(edge);
    });

    this.scene.add(group);
    this.segments.push(group);
    this.nextSegmentZ -= this.segmentLength;
  }

  getSurfaceY() {
    if (this.segments.length === 0) return 0;

    const surface = this.segments[0].children[0];
    if (!surface) return 0;

    surface.getWorldPosition(this._surfacePosition);
    return this._surfacePosition.y;
  }

  update(playerZ) {
    const lastSegment = this.segments[this.segments.length - 1];
    if (lastSegment && playerZ < lastSegment.position.z + this.segmentLength) {
      this._addSegment();
    }

    while (this.segments.length > 0) {
      const first = this.segments[0];
      if (first.position.z > playerZ + this.segmentLength * 2) {
        this.scene.remove(first);
        first.traverse(child => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
        });
        this.segments.shift();
      } else {
        break;
      }
    }
  }

  reset() {
    this.segments.forEach(seg => {
      this.scene.remove(seg);
      seg.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
    });
    this.segments = [];
    this.nextSegmentZ = 0;
    this._createInitialTrack();
  }
}
