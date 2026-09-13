import { CONFIG } from '../engine/Config.js';
import { NPC } from '../entities/NPC.js';
import { Barrier } from '../entities/Barrier.js';
import { ShapeFactory } from '../engine/ShapeFactory.js';

export class Spawner {
  constructor(scene) {
    this.scene = scene;
    this.npcPool = [];
    this.npcActive = [];
    this.barrierPool = [];
    this.barrierActive = [];

    this.npcSpawnTimer = 0;
    this.barrierSpawnTimer = 0;
    this.lastSpawnLane = -1;
    this.lastSpawnType = '';
    this.distanceSinceLastNPC = 0;
    this.distanceSinceLastBarrier = 0;
    this.gameStartTime = performance.now();

    for (let i = 0; i < 20; i++) {
      this.npcPool.push(new NPC());
    }
    for (let i = 0; i < 8; i++) {
      this.barrierPool.push(new Barrier());
    }

    this.maxNPCHalfWidth = ShapeFactory.getMaxNPCHalfWidth();
    this.trackInnerBoundary = CONFIG.TRACK_INNER_BOUNDARY - CONFIG.NPC_WALL_CLEARANCE;

    this.barrierHalfWidth = CONFIG.LANE_WIDTH * 0.8 * 0.5;
    this.barrierHalfDepth = 0.6 * 0.5;
    this.barrierHeight = CONFIG.BARRIER_COLLISION_HEIGHT;
    this.spawnSafetyMargin = CONFIG.MIN_SPAWN_GAP * 0.3;

    this.encounterZoneDepth = CONFIG.NPC_OBSTACLE_VISUAL_GAP * 2;
  }

  _getNPC() {
    if (this.npcPool.length > 0) return this.npcPool.pop();
    return new NPC();
  }

  _releaseNPC(npc) {
    npc.reset();
    this.npcPool.push(npc);
  }

  _getBarrier() {
    if (this.barrierPool.length > 0) return this.barrierPool.pop();
    return new Barrier();
  }

  _releaseBarrier(barrier) {
    barrier.reset();
    barrier.deactivate(this.scene);
    this.barrierPool.push(barrier);
  }

  _isEarlyGame() {
    return performance.now() - this.gameStartTime < CONFIG.EARLY_GAME_DURATION;
  }

  _isMovingNPCEarlyGame() {
    return performance.now() - this.gameStartTime < CONFIG.MOVING_NPC_EARLY_GAME_DURATION;
  }

  _getNPCBounds(lane, zPos, shape) {
    const halfWidth = ShapeFactory.getNPCHalfWidth(shape);
    const laneX = CONFIG.LANE_POSITIONS[lane];
    const maxCenterX = this.trackInnerBoundary - halfWidth;
    const clampedX = Math.max(-maxCenterX, Math.min(maxCenterX, laneX));
    return {
      minX: clampedX - halfWidth,
      maxX: clampedX + halfWidth,
      minY: CONFIG.PLAYER_Y - halfWidth,
      maxY: CONFIG.PLAYER_Y + halfWidth,
      minZ: zPos - halfWidth,
      maxZ: zPos + halfWidth,
      centerX: clampedX,
      centerZ: zPos
    };
  }

  _getBarrierBounds(lane, zPos) {
    const laneX = CONFIG.LANE_POSITIONS[lane];
    return {
      minX: laneX - this.barrierHalfWidth,
      maxX: laneX + this.barrierHalfWidth,
      minY: 0,
      maxY: this.barrierHeight,
      minZ: zPos - this.barrierHalfDepth,
      maxZ: zPos + this.barrierHalfDepth,
      centerX: laneX,
      centerZ: zPos
    };
  }

  _boundsOverlap(a, b, margin = 0) {
    return !(
      a.maxX + margin < b.minX - margin ||
      a.minX - margin > b.maxX + margin ||
      a.maxY + margin < b.minY - margin ||
      a.minY - margin > b.maxY + margin ||
      a.maxZ + margin < b.minZ - margin ||
      a.minZ - margin > b.maxZ + margin
    );
  }

  _getRequiredZGap(lane, isSameLane) {
    if (isSameLane) {
      return CONFIG.NPC_OBSTACLE_SAME_LANE_GAP;
    }
    return CONFIG.NPC_OBSTACLE_VISUAL_GAP;
  }

  _checkEncounterZoneClear(lane, zPos, shape, isMultiTarget = false, zOffset = 0) {
    const requiredGap = isMultiTarget 
      ? CONFIG.NPC_OBSTACLE_MULTI_TARGET_GAP 
      : this._getRequiredZGap(lane, true);
    
    for (const barrier of this.barrierActive) {
      if (barrier.lane !== lane) continue;
      
      const dz = Math.abs(barrier.group.position.z - zPos);
      if (dz < requiredGap) {
        return false;
      }
    }
    
    for (const npc of this.npcActive) {
      if (npc.lane !== lane) continue;
      
      const dz = Math.abs(npc.group.position.z - zPos);
      if (dz < requiredGap * 0.5) {
        return false;
      }
    }
    
    return true;
  }

  _getEncounterZoneBounds(lane, zPos, shape) {
    const npcBounds = this._getNPCBounds(lane, zPos, shape);
    const halfDepth = Math.max(npcBounds.maxZ - npcBounds.minZ, CONFIG.NPC_OBSTACLE_VISUAL_GAP);
    return {
      minZ: zPos - halfDepth,
      maxZ: zPos + halfDepth,
      lane: lane
    };
  }

  _isEncounterZoneClear(zoneBounds, excludeNpc = null) {
    for (const barrier of this.barrierActive) {
      if (barrier.lane !== zoneBounds.lane) continue;
      const bZ = barrier.group.position.z;
      if (bZ > zoneBounds.minZ && bZ < zoneBounds.maxZ) {
        return false;
      }
    }
    
    for (const npc of this.npcActive) {
      if (npc === excludeNpc) continue;
      if (npc.lane !== zoneBounds.lane) continue;
      const nZ = npc.group.position.z;
      if (nZ > zoneBounds.minZ && nZ < zoneBounds.maxZ) {
        return false;
      }
    }
    
    return true;
  }

  _findValidEncounterPosition(shape, excludeLanes = [], isMoving = false, isMultiTarget = false) {
    const validLanes = isMoving 
      ? this._getValidLanesForShape(shape).filter(l => {
          const targets = this._getValidMoveTargets(l);
          return targets.some(t => this._getValidLanesForShape(shape).includes(t));
        })
      : this._getValidLanesForShape(shape);
    
    const candidates = validLanes.filter(l => !excludeLanes.includes(l));
    
    for (const lane of candidates) {
      if (this._checkEncounterZoneClear(lane, -CONFIG.SPAWN_DISTANCE, shape, isMultiTarget)) {
        return lane;
      }
    }
    
    for (const lane of candidates) {
      if (this._canSafelySpawnInLane(lane)) {
        return lane;
      }
    }
    
    return candidates.length > 0 ? candidates[0] : validLanes[0];
  }

  _findSafeLaneForBarrier(excludeLanes = []) {
    const candidates = CONFIG.LANE_POSITIONS.map((_, i) => i).filter(i => !excludeLanes.includes(i));

    for (const lane of candidates) {
      if (this._isPositionSafeForBarrier(lane, -CONFIG.SPAWN_DISTANCE)) {
        if (this._checkEncounterZoneClear(lane, -CONFIG.SPAWN_DISTANCE, 'circle', false)) {
          return lane;
        }
      }
    }

    for (const lane of candidates) {
      if (this._canSafelySpawnInLane(lane)) {
        return lane;
      }
    }

    return candidates.length > 0 ? candidates[0] : 1;
  }

  _canNPCMoveToLane(npc, targetLane) {
    if (!npc.isMoving || npc.moveTargetLane !== targetLane) return false;

    const npcZ = npc.group.position.z;
    const npcShape = npc.shape;
    const currentLane = npc.lane;
    const halfWidth = ShapeFactory.getNPCHalfWidth(npcShape);
    const maxCenterX = this.trackInnerBoundary - halfWidth;

    const startX = CONFIG.LANE_POSITIONS[currentLane];
    const clampedStartX = Math.max(-maxCenterX, Math.min(maxCenterX, startX));
    const targetX = CONFIG.LANE_POSITIONS[targetLane];
    const clampedTargetX = Math.max(-maxCenterX, Math.min(maxCenterX, targetX));

    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const interpX = clampedStartX + (clampedTargetX - clampedStartX) * t;
      const testBounds = {
        minX: interpX - halfWidth,
        maxX: interpX + halfWidth,
        minY: CONFIG.PLAYER_Y - halfWidth,
        maxY: CONFIG.PLAYER_Y + halfWidth,
        minZ: npcZ - halfWidth,
        maxZ: npcZ + halfWidth
      };

      for (const barrier of this.barrierActive) {
        if (barrier.lane !== targetLane && barrier.lane !== currentLane) continue;
        const barrierBounds = this._getBarrierBounds(barrier.lane, barrier.group.position.z);
        if (this._boundsOverlap(testBounds, barrierBounds, this.spawnSafetyMargin)) {
          return false;
        }
        
        const dz = Math.abs(barrier.group.position.z - npcZ);
        const requiredGap = barrier.lane === targetLane 
          ? CONFIG.NPC_OBSTACLE_SAME_LANE_GAP 
          : CONFIG.NPC_OBSTACLE_VISUAL_GAP;
        if (dz < requiredGap) {
          return false;
        }
      }
    }

    return true;
  }

  _getMultiTargetProbability(streak) {
    if (this._isEarlyGame()) return 0.1;
    const baseProb = CONFIG.MULTI_TARGET_PROBABILITY;
    const streakBonus = Math.min(streak * 0.01, 0.2);
    return Math.min(baseProb + streakBonus, 0.5);
  }

  _getRiskProbability(streak) {
    if (this._isEarlyGame()) return 0;
    return CONFIG.RISK_TARGET_PROBABILITY;
  }

  _getMovingNPCProbability(streak) {
    if (this._isMovingNPCEarlyGame()) return 0;
    const baseProb = CONFIG.MOVING_NPC_PROBABILITY;
    const streakBonus = Math.min(streak * 0.005, 0.05);
    return Math.min(baseProb + streakBonus, 0.15);
  }

  _getAvailableLanes(excludeLanes = []) {
    return CONFIG.LANE_POSITIONS.map((_, i) => i).filter(i => !excludeLanes.includes(i));
  }

  _getValidLanesForShape(shape) {
    const halfWidth = ShapeFactory.getNPCHalfWidth(shape);
    const maxCenterX = this.trackInnerBoundary - halfWidth;
    return CONFIG.LANE_POSITIONS.map((x, i) => ({ x, i }))
      .filter(lane => Math.abs(lane.x) <= maxCenterX)
      .map(lane => lane.i);
  }

  _getValidMoveTargets(lane) {
    const targets = [];
    if (lane > 0) targets.push(lane - 1);
    if (lane < CONFIG.LANE_POSITIONS.length - 1) targets.push(lane + 1);
    return targets;
  }

  _canSafelySpawnInLane(lane, zOffset = 0) {
    const zPos = -CONFIG.SPAWN_DISTANCE + zOffset;

    for (const npc of this.npcActive) {
      if (npc.lane === lane) {
        const dz = Math.abs(npc.group.position.z - zPos);
        if (dz < CONFIG.MIN_SPAWN_GAP * 0.5) return false;
      }
    }

    for (const barrier of this.barrierActive) {
      if (barrier.lane === lane) {
        const dz = Math.abs(barrier.group.position.z - zPos);
        if (dz < CONFIG.MIN_SPAWN_GAP * 0.5) return false;
      }
    }

    return true;
  }

_spawnSingleNPC(streak) {
    const npc = this._getNPC();
    const shapeIdx = Math.floor(Math.random() * CONFIG.SHAPES.length);
    const shape = CONFIG.SHAPES[shapeIdx];

    const lane = this._findValidEncounterPosition(shape, [], false, false);

    const isRisk = Math.random() < this._getRiskProbability(streak);
    const targetType = isRisk ? 'risk' : 'safe';
    const crowdReward = isRisk ? CONFIG.RISK_CROWD_REWARD : CONFIG.SAFE_CROWD_REWARD;

    npc.init(this.scene, shape, lane, -CONFIG.SPAWN_DISTANCE, targetType, crowdReward);
    this.npcActive.push(npc);
    this.lastSpawnLane = lane;
    this.lastSpawnType = 'npc';
  }

  _spawnMovingNPC(streak) {
    const npc = this._getNPC();
    const shapeIdx = Math.floor(Math.random() * CONFIG.SHAPES.length);
    const shape = CONFIG.SHAPES[shapeIdx];

    const lane = this._findValidEncounterPosition(shape, [], true, false);
    const validLanes = this._getValidLanesForShape(shape);
    const targets = this._getValidMoveTargets(lane);
    const validTargets = targets.filter(t => validLanes.includes(t) && this._checkEncounterZoneClear(t, -CONFIG.SPAWN_DISTANCE, shape));

    if (validTargets.length === 0) {
      this._releaseNPC(npc);
      return;
    }

    const targetLane = validTargets[Math.floor(Math.random() * validTargets.length)];

    const isRisk = Math.random() < this._getRiskProbability(streak);
    const targetType = isRisk ? 'risk' : 'safe';
    const crowdReward = isRisk ? CONFIG.RISK_CROWD_REWARD : CONFIG.SAFE_CROWD_REWARD;

    npc.init(this.scene, shape, lane, -CONFIG.SPAWN_DISTANCE, targetType, crowdReward);
    this.npcActive.push(npc);
    this.lastSpawnLane = lane;
    this.lastSpawnType = 'npc';

    const moveStartDistance = CONFIG.MOVING_NPC_MOVE_START_DISTANCE;
    const moveDuration = CONFIG.MOVING_NPC_MOVE_DURATION;
    npc.startMove(targetLane, moveStartDistance, moveDuration);
  }

  _spawnMultiTarget(streak) {
    const targetCount = Math.min(
      2 + Math.floor(Math.random() * 2),
      CONFIG.MULTI_TARGET_MAX_COUNT
    );

    const availableLanes = this._getAvailableLanes();
    const shuffled = [...availableLanes].sort(() => Math.random() - 0.5);

    const shapes = [...CONFIG.SHAPES].sort(() => Math.random() - 0.5);
    const hasRisk = targetCount >= 2 && Math.random() < this._getRiskProbability(streak);
    const riskIndex = hasRisk ? Math.floor(Math.random() * targetCount) : -1;

    const selectedLanes = [];
    for (const lane of shuffled) {
      if (selectedLanes.length >= targetCount) break;
      const shape = shapes[selectedLanes.length % shapes.length];
      const validLanes = this._getValidLanesForShape(shape);
      if (!validLanes.includes(lane)) continue;
      if (!this._checkEncounterZoneClear(lane, -CONFIG.SPAWN_DISTANCE + selectedLanes.length * CONFIG.RISK_SPAWN_DELAY, shape, true)) continue;
      selectedLanes.push(lane);
    }

    if (selectedLanes.length === 0) return;

    selectedLanes.forEach((lane, i) => {
      const shape = shapes[i % shapes.length];
      const isRisk = i === riskIndex;
      const targetType = isRisk ? 'risk' : 'safe';
      const crowdReward = isRisk ? CONFIG.RISK_CROWD_REWARD : CONFIG.SAFE_CROWD_REWARD;

      const zOffset = i * CONFIG.RISK_SPAWN_DELAY;
      const npc = this._getNPC();
      npc.init(this.scene, shape, lane, -CONFIG.SPAWN_DISTANCE + zOffset, targetType, crowdReward);
      this.npcActive.push(npc);
    });

    this.lastSpawnLane = selectedLanes[0];
    this.lastSpawnType = 'npc';
  }

  _spawnNPC(streak) {
    const multiProb = this._getMultiTargetProbability(streak);
    const movingProb = this._getMovingNPCProbability(streak);

    const rand = Math.random();
    if (rand < movingProb) {
      this._spawnMovingNPC(streak);
    } else if (rand < movingProb + multiProb) {
      this._spawnMultiTarget(streak);
    } else {
      this._spawnSingleNPC(streak);
    }
  }

  _spawnBarrier() {
    const barrier = this._getBarrier();

    const excludeLanes = (this.lastSpawnType === 'barrier') ? [this.lastSpawnLane] : [];
    const lane = this._findSafeLaneForBarrier(excludeLanes);

    barrier.init(this.scene, lane, -CONFIG.SPAWN_DISTANCE);
    this.barrierActive.push(barrier);
    this.lastSpawnLane = lane;
    this.lastSpawnType = 'barrier';
  }

  update(speed, streak) {
    this.npcSpawnTimer++;
    this.barrierSpawnTimer++;
    this.distanceSinceLastNPC += speed;
    this.distanceSinceLastBarrier += speed;

    const adjustedNPCInterval = Math.max(35, CONFIG.NPC_SPAWN_INTERVAL - streak * 0.5);
    const adjustedBarrierInterval = Math.max(55, CONFIG.BARRIER_SPAWN_INTERVAL - streak * 0.3);

    if (this.npcSpawnTimer >= adjustedNPCInterval && this.distanceSinceLastNPC >= CONFIG.MIN_SPAWN_GAP) {
      this._spawnNPC(streak);
      this.npcSpawnTimer = 0;
      this.distanceSinceLastNPC = 0;
    }

    if (this.barrierSpawnTimer >= adjustedBarrierInterval && this.distanceSinceLastBarrier >= CONFIG.MIN_SPAWN_GAP) {
      this._spawnBarrier();
      this.barrierSpawnTimer = 0;
      this.distanceSinceLastBarrier = 0;
    }

    for (let i = this.npcActive.length - 1; i >= 0; i--) {
      const npc = this.npcActive[i];
      npc.update(speed);

      if (npc.isMoving && npc.moveTargetLane !== null) {
        if (!this._canNPCMoveToLane(npc, npc.moveTargetLane)) {
          npc.cancelMove();
        }
      }

      if (npc.group.position.z > CONFIG.DESPAWN_DISTANCE) {
        npc.deactivate(this.scene);
        this.npcActive.splice(i, 1);
        this._releaseNPC(npc);
      }
    }

    for (let i = this.barrierActive.length - 1; i >= 0; i--) {
      const barrier = this.barrierActive[i];
      barrier.update(speed);
      if (barrier.group.position.z > CONFIG.DESPAWN_DISTANCE) {
        this._releaseBarrier(barrier);
        this.barrierActive.splice(i, 1);
      }
    }
  }

  getActiveNPCs() {
    return this.npcActive;
  }

  getActiveBarriers() {
    return this.barrierActive;
  }

  removeNPC(npc) {
    const idx = this.npcActive.indexOf(npc);
    if (idx !== -1) {
      this.npcActive.splice(idx, 1);
      npc.deactivate(this.scene);
      this._releaseNPC(npc);
    }
  }

  removeBarrier(barrier) {
    const idx = this.barrierActive.indexOf(barrier);
    if (idx !== -1) {
      this.barrierActive.splice(idx, 1);
      this._releaseBarrier(barrier);
    }
  }

  reset() {
    this.npcActive.forEach(n => {
      n.deactivate(this.scene);
      this.npcPool.push(n);
    });
    this.npcActive = [];

    this.barrierActive.forEach(b => {
      b.deactivate(this.scene);
      this.barrierPool.push(b);
    });
    this.barrierActive = [];

    this.npcSpawnTimer = 0;
    this.barrierSpawnTimer = 0;
    this.distanceSinceLastNPC = 0;
    this.distanceSinceLastBarrier = 0;
    this.gameStartTime = performance.now();
  }
}