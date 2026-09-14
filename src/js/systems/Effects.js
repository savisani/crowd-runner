export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.trails = [];
    this.cameraShakeIntensity = 0;
    this.cameraShakeDuration = 0;
    this.lightPulseIntensity = 0;
    this.lightPulseDuration = 0;

    this.flameAuraActive = false;
    this.flameAuraLevel = 0;
    this.flameMeshes = [];
    this.flameStates = [];
    this.auraLight = null;
    this.flameSparkTimer = 0;

    this._initParticles();
    this._initTrails();
    this._initLights();
    this._initCosmicBackground();
    this._initFlameAura();
  }

  _getAuraConfig(level) {
    const map = {
      1: {
        count: CONFIG.AURA_L1_PARTICLE_COUNT,
        height: CONFIG.AURA_L1_FLAME_HEIGHT,
        intensity: CONFIG.AURA_L1_INTENSITY,
        core: CONFIG.AURA_L1_COLOR_CORE,
        tip: CONFIG.AURA_L1_COLOR_TIP,
      },
      2: {
        count: CONFIG.AURA_L2_PARTICLE_COUNT,
        height: CONFIG.AURA_L2_FLAME_HEIGHT,
        intensity: CONFIG.AURA_L2_INTENSITY,
        core: CONFIG.AURA_L2_COLOR_CORE,
        tip: CONFIG.AURA_L2_COLOR_TIP,
      },
      3: {
        count: CONFIG.AURA_L3_PARTICLE_COUNT,
        height: CONFIG.AURA_L3_FLAME_HEIGHT,
        intensity: CONFIG.AURA_L3_INTENSITY,
        core: CONFIG.AURA_L3_COLOR_CORE,
        tip: CONFIG.AURA_L3_COLOR_TIP,
      },
      4: {
        count: CONFIG.AURA_L4_PARTICLE_COUNT,
        height: CONFIG.AURA_L4_FLAME_HEIGHT,
        intensity: CONFIG.AURA_L4_INTENSITY,
        core: CONFIG.AURA_L4_COLOR_CORE,
        tip: CONFIG.AURA_L4_COLOR_TIP,
      },
      5: {
        count: CONFIG.AURA_L5_PARTICLE_COUNT,
        height: CONFIG.AURA_L5_FLAME_HEIGHT,
        intensity: CONFIG.AURA_L5_INTENSITY,
        core: CONFIG.AURA_L5_COLOR_CORE,
        tip: CONFIG.AURA_L5_COLOR_TIP,
      },
    };
    return map[Math.min(level, 5)] || map[1];
  }

  _initFlameAura() {
    const cfg = this._getAuraConfig(1);
    const flameCount = cfg.count;

    for (let i = 0; i < flameCount; i++) {
      const geo = new THREE.ConeGeometry(0.12, 0.5, 5);
      const mat = new THREE.MeshBasicMaterial({
        color: cfg.core,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.flameMeshes.push(mesh);

      this.flameStates.push({
        active: false,
        life: 0,
        maxLife: 0,
        baseRadius: 0,
        angle: 0,
        riseSpeed: 0,
        flickerPhase: Math.random() * Math.PI * 2,
        width: 0,
        x: 0, y: 0, z: 0,
      });
    }

    this.auraLight = new THREE.PointLight(cfg.core, 0, 8);
    this.auraLight.position.set(0, 2, 0);
    this.scene.add(this.auraLight);
  }

  activateFlameAura(level) {
    this.flameAuraActive = true;
    this.flameAuraLevel = level;
    const cfg = this._getAuraConfig(level);

    for (let i = 0; i < this.flameMeshes.length; i++) {
      const mesh = this.flameMeshes[i];
      mesh.material.color.setHex(cfg.core);
      mesh.material.opacity = cfg.intensity * 0.7;
      mesh.visible = true;
      mesh.scale.setScalar(1.0);

      const state = this.flameStates[i];
      state.active = true;
      state.life = Math.random() * 30;
      state.maxLife = 40 + Math.random() * 30;
      state.baseRadius = 0.5 + Math.random() * 0.5;
      state.angle = (i / this.flameMeshes.length) * Math.PI * 2 + Math.random() * 0.3;
      state.riseSpeed = 0.015 + Math.random() * 0.01;
      state.flickerPhase = Math.random() * Math.PI * 2;
      state.width = 0.1 + Math.random() * 0.08;
    }

    if (this.auraLight) {
      this.auraLight.color.setHex(cfg.core);
      this.auraLight.intensity = cfg.intensity * 0.6;
      this.auraLight.visible = true;
    }
  }

  upgradeFlameAura(level) {
    this.activateFlameAura(level);
  }

  updateFlameAura(playerPos, dt) {
    if (!this.flameAuraActive) return;

    this._lastPlayerPos = playerPos;
    const cfg = this._getAuraConfig(this.flameAuraLevel);
    const time = performance.now() * 0.003;

    for (let i = 0; i < this.flameMeshes.length; i++) {
      const mesh = this.flameMeshes[i];
      const state = this.flameStates[i];

      if (!state.active) continue;

      state.life++;
      if (state.life >= state.maxLife) {
        state.life = 0;
        state.maxLife = 40 + Math.random() * 30;
        state.baseRadius = 0.5 + Math.random() * 0.5;
        state.angle = (i / this.flameMeshes.length) * Math.PI * 2 + Math.random() * 0.3;
        state.riseSpeed = 0.015 + Math.random() * 0.01;
      }

      const progress = state.life / state.maxLife;
      const rise = progress * cfg.height;
      const flicker = Math.sin(time * 3 + state.flickerPhase) * 0.15 + Math.sin(time * 7 + state.flickerPhase) * 0.08;
      const scale = (0.6 + flicker) * (1.0 - progress * 0.4);

      const wobble = Math.sin(time * 2 + state.flickerPhase) * 0.15;
      const currentRadius = state.baseRadius + wobble;

      state.x = Math.cos(state.angle) * currentRadius;
      state.z = Math.sin(state.angle) * currentRadius;
      state.y = rise;

      mesh.position.set(
        playerPos.x + state.x,
        playerPos.y + state.y,
        playerPos.z + state.z
      );
      mesh.scale.setScalar(Math.max(0.01, scale));
      mesh.rotation.y = state.angle + time * 0.5;

      const opacity = cfg.intensity * 0.7 * Math.sin(progress * Math.PI);
      mesh.material.opacity = Math.max(0, opacity);
      mesh.material.color.setHex(progress > 0.6 ? cfg.tip : cfg.core);
    }

    if (this.auraLight) {
      const pulse = Math.sin(time * 4) * 0.15;
      this.auraLight.intensity = cfg.intensity * (0.5 + pulse);
      this.auraLight.position.set(playerPos.x, playerPos.y + 1.5, playerPos.z);
    }

    this.flameSparkTimer += dt;
    if (this.flameSparkTimer > 0.08) {
      this.flameSparkTimer = 0;
      this._spawnFlameSparks(cfg, playerPos);
    }
  }

  _spawnFlameSparks(cfg, playerPos) {
    const count = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      const p = this._acquireParticle();
      if (!p) break;
      p.active = true;
      p.life = 0;
      p.maxLife = 30 + Math.random() * 30;
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.3 + Math.random() * 0.4;
      p.x = playerPos.x + Math.cos(angle) * radius;
      p.y = playerPos.y;
      p.z = playerPos.z + Math.sin(angle) * radius;
      p.vx = (Math.random() - 0.5) * 0.01;
      p.vy = 0.02 + Math.random() * 0.03;
      p.vz = (Math.random() - 0.5) * 0.01;
      p.r = ((cfg.tip >> 16) & 255) / 255;
      p.g = ((cfg.tip >> 8) & 255) / 255;
      p.b = (cfg.tip & 255) / 255;
    }
  }

  deactivateFlameAura() {
    this.flameAuraActive = false;
    this.flameAuraLevel = 0;
    for (const mesh of this.flameMeshes) {
      mesh.visible = false;
      mesh.material.opacity = 0;
    }
    for (const state of this.flameStates) {
      state.active = false;
    }
    if (this.auraLight) {
      this.auraLight.intensity = 0;
      this.auraLight.visible = false;
    }
  }

  isFlameAuraActive() {
    return this.flameAuraActive;
  }

  spawnCoinBurst(x, y, z) {
    const count = 8;
    for (let i = 0; i < count; i++) {
      const p = this._acquireParticle();
      if (!p) break;
      p.active = true;
      p.life = 0;
      p.maxLife = 25 + Math.random() * 15;
      p.x = x + (Math.random() - 0.5) * 0.3;
      p.y = y + 0.2;
      p.z = z + (Math.random() - 0.5) * 0.3;
      const angle = (i / count) * Math.PI * 2;
      const speed = 0.04 + Math.random() * 0.03;
      p.vx = Math.cos(angle) * speed;
      p.vy = 0.06 + Math.random() * 0.04;
      p.vz = Math.sin(angle) * speed;
      p.r = 1.0; p.g = 0.85; p.b = 0.0;
    }
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

  _initCosmicBackground() {
    this.cosmicObjects = [];

    this._createStarField(200, 80, 0xffffff, 0.4);
    this._createStarField(100, 50, 0xaaccff, 0.3);
    this._createStarField(50, 40, 0xffddaa, 0.25);

    this._createPlanet(0x2244aa, 3.0, 40, 20, 0.3);
    this._createPlanet(0xaa3322, 1.5, -35, 15, 0.2);
    this._createRingedPlanet(0x886644, 0xffcc88, 2.0, 50, 25, 0.15);
    this._createMoon(0x999999, 0.8, -25, 12, 0.25);

    this._createNebula(0x332255, 0.15, 60, 30, 0.05);
    this._createNebula(0x223344, 0.12, -55, 25, 0.04);

    this._createDistantGalaxy(0x554477, 1.2, 70, 35, 0.08);
    this._createDistantGalaxy(0x445566, 0.8, -65, 28, 0.06);
  }

  _createStarField(count, spread, color, opacity) {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * spread;
      positions[i * 3 + 1] = Math.random() * spread * 0.5 + 5;
      positions[i * 3 + 2] = -Math.random() * 100;
      sizes[i] = 0.1 + Math.random() * 0.2;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.PointsMaterial({
      color,
      size: 0.15,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geo, mat);
    points.userData.parallaxFactor = 0.02 + Math.random() * 0.03;
    points.userData.baseZ = 0;
    this.scene.add(points);
    this.cosmicObjects.push(points);
  }

  _createPlanet(color, radius, x, y, parallax) {
    const geo = new THREE.SphereGeometry(radius, 16, 12);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.7,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, -80 - Math.random() * 20);
    mesh.userData.parallaxFactor = parallax;
    mesh.userData.baseY = y;
    mesh.userData.bobPhase = Math.random() * Math.PI * 2;
    this.scene.add(mesh);
    this.cosmicObjects.push(mesh);
  }

  _createRingedPlanet(bodyColor, ringColor, radius, x, y, parallax) {
    const group = new THREE.Group();

    const bodyGeo = new THREE.SphereGeometry(radius, 16, 12);
    const bodyMat = new THREE.MeshBasicMaterial({
      color: bodyColor,
      transparent: true,
      opacity: 0.7,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    group.add(body);

    const ringGeo = new THREE.RingGeometry(radius * 1.4, radius * 1.8, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: ringColor,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI * 0.35;
    group.add(ring);

    group.position.set(x, y, -90 - Math.random() * 20);
    group.userData.parallaxFactor = parallax;
    group.userData.baseY = y;
    group.userData.bobPhase = Math.random() * Math.PI * 2;
    this.scene.add(group);
    this.cosmicObjects.push(group);
  }

  _createMoon(color, radius, x, y, parallax) {
    const geo = new THREE.SphereGeometry(radius, 12, 8);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.6,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, -70 - Math.random() * 15);
    mesh.userData.parallaxFactor = parallax;
    mesh.userData.baseY = y;
    mesh.userData.bobPhase = Math.random() * Math.PI * 2;
    this.scene.add(mesh);
    this.cosmicObjects.push(mesh);
  }

  _createNebula(color, opacity, x, y, parallax) {
    const geo = new THREE.SphereGeometry(8, 8, 6);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, -90 - Math.random() * 20);
    mesh.scale.set(1, 0.4, 1);
    mesh.userData.parallaxFactor = parallax;
    mesh.userData.baseY = y;
    this.scene.add(mesh);
    this.cosmicObjects.push(mesh);
  }

  _createDistantGalaxy(color, size, x, y, parallax) {
    const geo = new THREE.CircleGeometry(size, 24);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, -100 - Math.random() * 30);
    mesh.rotation.z = Math.random() * Math.PI;
    mesh.userData.parallaxFactor = parallax;
    mesh.userData.baseY = y;
    this.scene.add(mesh);
    this.cosmicObjects.push(mesh);
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
      const speed = 0.12 + Math.random() * 0.15;
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

  spawnRivalDefeatedParticles(x, y, z) {
    for (let i = 0; i < 25; i++) {
      const p = this._acquireParticle();
      if (!p) break;
      p.active = true;
      p.life = 0;
      p.maxLife = CONFIG.PARTICLE_LIFETIME * 1.2;
      p.x = x + (Math.random() - 0.5) * 1.0;
      p.y = y + Math.random() * 1.5;
      p.z = z + (Math.random() - 0.5) * 1.0;
      const angle = (i / 25) * Math.PI * 2;
      const speed = 0.1 + Math.random() * 0.1;
      p.vx = Math.cos(angle) * speed;
      p.vy = 0.1 + Math.random() * 0.15;
      p.vz = Math.sin(angle) * speed;
      if (i % 2 === 0) {
        p.r = 0.3; p.g = 1.0; p.b = 0.3;
      } else {
        p.r = 1.0; p.g = 0.85; p.b = 0.0;
      }
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
    for (const obj of this.cosmicObjects) {
      const parallax = obj.userData.parallaxFactor || 0.02;
      const offset = playerZ * parallax;

      if (obj.isPoints) {
        const positions = obj.geometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
          positions[i + 2] = positions[i + 2] - offset * 0.01;
        }
        obj.geometry.attributes.position.needsUpdate = true;
      } else if (obj.children && obj.children.length > 0) {
        obj.position.z = (obj.userData.baseY || 0) - 80 - offset;
        if (obj.userData.bobPhase !== undefined) {
          obj.userData.bobPhase += 0.005;
          obj.position.y = (obj.userData.baseY || 0) + Math.sin(obj.userData.bobPhase) * 0.5;
        }
      } else {
        if (obj.userData.baseY !== undefined) {
          obj.position.z = -80 - offset;
          if (obj.userData.bobPhase !== undefined) {
            obj.userData.bobPhase += 0.005;
            obj.position.y = obj.userData.baseY + Math.sin(obj.userData.bobPhase) * 0.5;
          }
        }
      }
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
    this.deactivateFlameAura();
  }
}
