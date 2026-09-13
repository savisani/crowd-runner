import * as THREE from 'three';
import { CONFIG } from '../engine/Config.js';

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.trails = [];
    this.cameraShakeIntensity = 0;
    this.cameraShakeDuration = 0;
    this.lightPulseIntensity = 0;
    this.lightPulseDuration = 0;

    this._initParticles();
    this._initTrails();
    this._initLights();
    this._initBackground();
  }

  _initParticles() {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(CONFIG.MAX_PARTICLES * 3);
    const colors = new Float32Array(CONFIG.MAX_PARTICLES * 3);
    const sizes = new Float32Array(CONFIG.MAX_PARTICLES);
    const alphas = new Float32Array(CONFIG.MAX_PARTICLES);

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

    const mat = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.particleSystem = new THREE.Points(geo, mat);
    this.scene.add(this.particleSystem);

    for (let i = 0; i < CONFIG.MAX_PARTICLES; i++) {
      this.particles.push({
        active: false,
        life: 0,
        maxLife: 0,
        x: 0, y: 0, z: 0,
        vx: 0, vy: 0, vz: 0,
        r: 1, g: 1, b: 1
      });
    }
  }

  _initTrails() {
    for (let i = 0; i < CONFIG.TRAIL_LENGTH; i++) {
      const geo = new THREE.SphereGeometry(0.08, 4, 4);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x7c5cff,
        transparent: true,
        opacity: 0.3 - i * 0.035
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.trails.push({ mesh, active: false });
    }
  }

  _initLights() {
    this.ambientLight = new THREE.AmbientLight(CONFIG.AMBIENT_LIGHT, 0.6);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(CONFIG.DIRECTIONAL_LIGHT, 0.8);
    this.dirLight.position.set(5, 10, 5);
    this.dirLight.castShadow = false;
    this.scene.add(this.dirLight);

    this.pointLight = new THREE.PointLight(0x7c5cff, 0.5, 30);
    this.pointLight.position.set(0, 5, -5);
    this.scene.add(this.pointLight);
  }

  _initBackground() {
    this.bgObjects = [];
    const colors = [0x3a1a6e, 0x2a1a5e, 0x4a2a8e, 0x1a0a3e];

    for (let i = 0; i < 12; i++) {
      const geo = new THREE.OctahedronGeometry(0.5 + Math.random() * 1.0, 0);
      const mat = new THREE.MeshBasicMaterial({
        color: colors[i % colors.length],
        transparent: true,
        opacity: 0.15
      });
      const mesh = new THREE.Mesh(geo, mat);
      const side = Math.random() > 0.5 ? 1 : -1;
      mesh.position.set(
        side * (6 + Math.random() * 5),
        1 + Math.random() * 4,
        -Math.random() * 80
      );
      mesh.userData.rotSpeed = 0.01 + Math.random() * 0.02;
      mesh.userData.baseY = mesh.position.y;
      mesh.userData.bobPhase = Math.random() * Math.PI * 2;
      this.scene.add(mesh);
      this.bgObjects.push(mesh);
    }
  }

  _acquireParticle() {
    for (let i = 0; i < this.particles.length; i++) {
      if (!this.particles[i].active) return this.particles[i];
    }
    return null;
  }

  spawnMatchParticles(x, y, z, shape) {
    const color = CONFIG.COLORS[shape];
    const r = ((color >> 16) & 255) / 255;
    const g = ((color >> 8) & 255) / 255;
    const b = (color & 255) / 255;

    for (let i = 0; i < 12; i++) {
      const p = this._acquireParticle();
      if (!p) break;
      p.active = true;
      p.life = 0;
      p.maxLife = CONFIG.PARTICLE_LIFETIME;
      p.x = x + (Math.random() - 0.5) * 0.5;
      p.y = y + Math.random() * 0.5;
      p.z = z + (Math.random() - 0.5) * 0.5;
      p.vx = (Math.random() - 0.5) * 0.08;
      p.vy = 0.05 + Math.random() * 0.08;
      p.vz = (Math.random() - 0.5) * 0.08;
      p.r = r; p.g = g; p.b = b;
    }
  }

  spawnStreakBurst(x, y, z, shape, streak) {
    const color = CONFIG.COLORS[shape];
    const r = ((color >> 16) & 255) / 255;
    const g = ((color >> 8) & 255) / 255;
    const b = (color & 255) / 255;

    let count = 12;
    let speedMult = 1;
    let sizeMult = 1;

    if (streak >= 3 && streak <= 4) {
      count = 18;
      speedMult = 1.3;
      sizeMult = 1.2;
    } else if (streak === 5) {
      count = 28;
      speedMult = 1.6;
      sizeMult = 1.4;
    } else if (streak >= 6 && streak <= 9) {
      count = 20;
      speedMult = 1.4;
      sizeMult = 1.3;
    } else if (streak >= 10) {
      count = 35;
      speedMult = 2.0;
      sizeMult = 1.6;
    }

    count = Math.min(count, CONFIG.MAX_PARTICLES);

    for (let i = 0; i < count; i++) {
      const p = this._acquireParticle();
      if (!p) break;
      p.active = true;
      p.life = 0;
      p.maxLife = CONFIG.PARTICLE_LIFETIME * (streak >= 5 ? 1.2 : 1);
      p.x = x + (Math.random() - 0.5) * 0.6 * sizeMult;
      p.y = y + Math.random() * 0.8 * sizeMult;
      p.z = z + (Math.random() - 0.5) * 0.6 * sizeMult;
      p.vx = (Math.random() - 0.5) * 0.12 * speedMult;
      p.vy = 0.06 + Math.random() * 0.12 * speedMult;
      p.vz = (Math.random() - 0.5) * 0.12 * speedMult;
      p.r = r; p.g = g; p.b = b;
    }
  }

  triggerCameraPunch(streak) {
    if (streak === 10) {
      this.cameraShakeIntensity = 0.06;
      this.cameraShakeDuration = 15;
    } else if (streak === 5) {
      this.cameraShakeIntensity = 0.03;
      this.cameraShakeDuration = 10;
    } else if (streak >= 3 && streak <= 4) {
      this.cameraShakeIntensity = 0.015;
      this.cameraShakeDuration = 6;
    }
  }

  triggerLightingPulse(streak) {
    if (streak >= 5) {
      this.lightPulseIntensity = 0.5;
      this.lightPulseDuration = streak >= 10 ? 25 : 15;
    }
  }

  triggerPerfectCameraPunch() {
    this.cameraShakeIntensity = 0.04;
    this.cameraShakeDuration = 8;
  }

  spawnPerfectBurst(x, y, z, shape) {
    const color = CONFIG.COLORS[shape];
    const r = ((color >> 16) & 255) / 255;
    const g = ((color >> 8) & 255) / 255;
    const b = (color & 255) / 255;

    const count = 22;

    for (let i = 0; i < count; i++) {
      const p = this._acquireParticle();
      if (!p) break;
      p.active = true;
      p.life = 0;
      p.maxLife = CONFIG.PARTICLE_LIFETIME * 1.3;
      p.x = x + (Math.random() - 0.5) * 0.8;
      p.y = y + Math.random() * 1.0;
      p.z = z + (Math.random() - 0.5) * 0.8;
      p.vx = (Math.random() - 0.5) * 0.15;
      p.vy = 0.08 + Math.random() * 0.15;
      p.vz = (Math.random() - 0.5) * 0.15;
      p.r = r; p.g = g; p.b = b;
    }
  }

  spawnPerfectCatchParticles(x, y, z, shape) {
    const color = CONFIG.COLORS[shape];
    const r = ((color >> 16) & 255) / 255;
    const g = ((color >> 8) & 255) / 255;
    const b = (color & 255) / 255;

    const count = 30;

    for (let i = 0; i < count; i++) {
      const p = this._acquireParticle();
      if (!p) break;
      p.active = true;
      p.life = 0;
      p.maxLife = CONFIG.PARTICLE_LIFETIME * 1.5;
      p.x = x + (Math.random() - 0.5) * 1.0;
      p.y = y + Math.random() * 1.2;
      p.z = z + (Math.random() - 0.5) * 1.0;
      const angle = (i / count) * Math.PI * 2;
      const speed = 0.12 + Math.random() * 0.08;
      p.vx = Math.cos(angle) * speed;
      p.vy = 0.1 + Math.random() * 0.15;
      p.vz = Math.sin(angle) * speed;
      p.r = r; p.g = g; p.b = b;
    }
  }

  spawnNearMissParticles(x, y, z, type) {
    const isBarrier = type === 'barrier';
    const r = isBarrier ? 1.0 : 1.0;
    const g = isBarrier ? 0.8 : 0.6;
    const b = isBarrier ? 0.2 : 0.2;

    const count = 15;

    for (let i = 0; i < count; i++) {
      const p = this._acquireParticle();
      if (!p) break;
      p.active = true;
      p.life = 0;
      p.maxLife = CONFIG.PARTICLE_LIFETIME * 0.8;
      p.x = x + (Math.random() - 0.5) * 0.6;
      p.y = y + Math.random() * 0.6;
      p.z = z + (Math.random() - 0.5) * 0.6;
      const angle = (i / count) * Math.PI * 2;
      const speed = 0.08 + Math.random() * 0.06;
      p.vx = Math.cos(angle) * speed;
      p.vy = 0.04 + Math.random() * 0.06;
      p.vz = Math.sin(angle) * speed;
      p.r = r; p.g = g; p.b = b;
    }
  }

  updateParticles() {
    if (this.cameraShakeDuration > 0) {
      this.cameraShakeDuration--;
    } else {
      this.cameraShakeIntensity = 0;
    }

    if (this.lightPulseDuration > 0) {
      this.lightPulseDuration--;
    } else {
      this.lightPulseIntensity = 0;
    }

    const positions = this.particleSystem.geometry.attributes.position.array;
    const colors = this.particleSystem.geometry.attributes.color.array;
    const sizes = this.particleSystem.geometry.attributes.size.array;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) {
        sizes[i] = 0;
        continue;
      }

      p.life++;
      if (p.life >= p.maxLife) {
        p.active = false;
        sizes[i] = 0;
        continue;
      }

      p.x += p.vx;
      p.y += p.vy;
      p.z += p.vz;
      p.vy -= 0.001;

      const lifeRatio = 1 - p.life / p.maxLife;

      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
      colors[i * 3] = p.r;
      colors[i * 3 + 1] = p.g;
      colors[i * 3 + 2] = p.b;
      sizes[i] = 0.3 * lifeRatio;
    }

    this.particleSystem.geometry.attributes.position.needsUpdate = true;
    this.particleSystem.geometry.attributes.color.needsUpdate = true;
    this.particleSystem.geometry.attributes.size.needsUpdate = true;
  }

  getCameraShakeOffset() {
    if (this.cameraShakeIntensity <= 0) return { x: 0, y: 0 };
    const x = (Math.random() - 0.5) * 2 * this.cameraShakeIntensity;
    const y = (Math.random() - 0.5) * 2 * this.cameraShakeIntensity;
    return { x, y };
  }

  spawnShapeChangeParticles(x, y, z, shape) {
    const color = CONFIG.COLORS[shape];
    const r = ((color >> 16) & 255) / 255;
    const g = ((color >> 8) & 255) / 255;
    const b = (color & 255) / 255;

    for (let i = 0; i < 6; i++) {
      const p = this._acquireParticle();
      if (!p) break;
      p.active = true;
      p.life = 0;
      p.maxLife = CONFIG.PARTICLE_LIFETIME * 0.4;
      p.x = x + (Math.random() - 0.5) * 0.3;
      p.y = y + (Math.random() - 0.5) * 0.3;
      p.z = z + (Math.random() - 0.5) * 0.3;
      const angle = (i / 6) * Math.PI * 2;
      p.vx = Math.cos(angle) * 0.06;
      p.vy = Math.sin(angle) * 0.04 + 0.02;
      p.vz = 0;
      p.r = r; p.g = g; p.b = b;
    }
  }

  spawnCrashParticles(x, y, z) {
    for (let i = 0; i < 20; i++) {
      const p = this._acquireParticle();
      if (!p) break;
      p.active = true;
      p.life = 0;
      p.maxLife = CONFIG.PARTICLE_LIFETIME * 1.5;
      p.x = x + (Math.random() - 0.5) * 0.3;
      p.y = y + Math.random() * 0.8;
      p.z = z + (Math.random() - 0.5) * 0.3;
      p.vx = (Math.random() - 0.5) * 0.15;
      p.vy = 0.08 + Math.random() * 0.12;
      p.vz = (Math.random() - 0.5) * 0.15;
      p.r = 1; p.g = 0.3; p.b = 0.2;
    }
  }

  spawnMismatchParticles(x, y, z) {
    for (let i = 0; i < 8; i++) {
      const p = this._acquireParticle();
      if (!p) break;
      p.active = true;
      p.life = 0;
      p.maxLife = CONFIG.PARTICLE_LIFETIME * 0.6;
      p.x = x;
      p.y = y;
      p.z = z;
      p.vx = (Math.random() - 0.5) * 0.05;
      p.vy = 0.02 + Math.random() * 0.04;
      p.vz = (Math.random() - 0.5) * 0.05;
      p.r = 1; p.g = 0.2; p.b = 0.3;
    }
  }

  updateTrails(x, y, z, active) {
    for (let i = 0; i < this.trails.length; i++) {
      const trail = this.trails[i];
      if (active) {
        trail.mesh.visible = true;
        trail.mesh.position.set(
          x + (Math.random() - 0.5) * 0.2,
          y + (Math.random() - 0.5) * 0.1,
          z + 1.5 + i * 0.35
        );
        trail.mesh.scale.setScalar(1 - i * 0.1);
      } else {
        trail.mesh.visible = false;
      }
    }
  }

  updateBackground(playerZ) {
    for (const obj of this.bgObjects) {
      obj.rotation.y += obj.userData.rotSpeed;
      obj.userData.bobPhase += 0.02;
      obj.position.y = obj.userData.baseY + Math.sin(obj.userData.bobPhase) * 0.3;
      obj.position.z = playerZ - 20 - Math.random() * 0.01;
    }
  }

  updateLighting(streak, crowdSize) {
    const intensity = 0.6 + Math.min(streak * 0.02, 0.4);
    this.ambientLight.intensity = intensity;

    const crowdBonus = Math.min(crowdSize * 0.005, 0.3);
    this.dirLight.intensity = 0.8 + crowdBonus;

    this.pointLight.intensity = 0.5 + crowdBonus;

    if (this.lightPulseIntensity > 0) {
      this.ambientLight.intensity += this.lightPulseIntensity;
      this.dirLight.intensity += this.lightPulseIntensity;
      this.pointLight.intensity += this.lightPulseIntensity;
    }
  }

  reset() {
    this.particles.forEach(p => p.active = false);
    this.trails.forEach(t => t.mesh.visible = false);
    this.cameraShakeIntensity = 0;
    this.cameraShakeDuration = 0;
    this.lightPulseIntensity = 0;
    this.lightPulseDuration = 0;
    this.ambientLight.intensity = 0.6;
    this.dirLight.intensity = 0.8;
    this.pointLight.intensity = 0.5;
  }
}