import { CONFIG } from '../engine/Config.js';

export class Collision {
  constructor(spawner, player, crowd) {
    this.spawner = spawner;
    this.player = player;
    this.crowd = crowd;
    this.debugLines = [];
  }

  checkAll() {
    const results = {
      npcMatch: [],
      npcMismatch: [],
      barrierHit: false,
      perfectCatch: [],
      nearMiss: []
    };

    this._checkNPCs(results);
    this._checkBarriers(results);
    this._checkNearMisses(results);

    return results;
  }

  _checkNPCs(results) {
    const playerLane = this.player.lane;
    const playerY = this.player.mesh.position.y;
    const playerZ = this.player.mesh.position.z;
    const playerPrevZ = this.player.prevZ;
    const npcs = this.spawner.getActiveNPCs();

    for (let i = npcs.length - 1; i >= 0; i--) {
      const npc = npcs[i];
      if (!npc.active) continue;
      if (npc.processedThisFrame) continue;

      const npcLane = typeof npc.getCurrentLane === 'function' ? npc.getCurrentLane() : npc.lane;
      if (npcLane !== playerLane) continue;

      const npcZ = npc.group.position.z;
      const npcPrevZ = npc.prevZ;

      const zOverlap = this._sweepZOverlap(
        playerZ, playerPrevZ,
        npcZ, npcPrevZ,
        CONFIG.NPC_COLLISION_Z_BACK,
        CONFIG.NPC_COLLISION_Z_FRONT
      );

      if (!zOverlap) continue;

      const npcY = npc.group.position.y;
      const verticalOverlap = Math.abs(playerY - npcY) < CONFIG.NPC_COLLISION_VERTICAL_TOLERANCE;

      if (!verticalOverlap) continue;

      npc.processedThisFrame = true;

      if (npc.shape === this.player.currentShape) {
        results.npcMatch.push(npc);
      } else {
        results.npcMismatch.push(npc);
      }
    }
  }

  _checkBarriers(results) {
    const playerLane = this.player.lane;
    const playerY = this.player.mesh.position.y;
    const playerZ = this.player.mesh.position.z;
    const playerPrevZ = this.player.prevZ;
    const barriers = this.spawner.getActiveBarriers();

    for (let i = barriers.length - 1; i >= 0; i--) {
      const barrier = barriers[i];
      if (!barrier.active) continue;
      if (barrier.processedThisFrame) continue;

      if (barrier.lane !== playerLane) continue;

      const bZ = barrier.group.position.z;
      const bPrevZ = barrier.prevZ;

      const zOverlap = this._sweepZOverlap(
        playerZ, playerPrevZ,
        bZ, bPrevZ,
        CONFIG.BARRIER_COLLISION_Z_BACK,
        CONFIG.BARRIER_COLLISION_Z_FRONT
      );

      if (!zOverlap) continue;

      if (this.player.isJumpingOver(CONFIG.BARRIER_CLEAR_HEIGHT)) continue;

      barrier.processedThisFrame = true;
      results.barrierHit = true;
      break;
    }
  }

  _checkNearMisses(results) {
    const playerLane = this.player.lane;
    const playerZ = this.player.mesh.position.z;
    const playerY = this.player.mesh.position.y;
    const npcs = this.spawner.getActiveNPCs();
    const barriers = this.spawner.getActiveBarriers();
    const nearMissDist = CONFIG.NEAR_MISS_DISTANCE;

    for (const npc of npcs) {
      if (!npc.active || npc.processedThisFrame || npc.nearMissTriggered) continue;
      if (npc.lane !== playerLane) continue;

      const dz = Math.abs(playerZ - npc.group.position.z);
      const dy = Math.abs(playerY - npc.group.position.y);
      
      if (dz < nearMissDist && dy < CONFIG.NPC_COLLISION_VERTICAL_TOLERANCE) {
        if (npc.shape !== this.player.currentShape) {
          npc.nearMissTriggered = true;
          results.nearMiss.push({ type: 'mismatch', entity: npc });
        }
      }
    }

    for (const barrier of barriers) {
      if (!barrier.active || barrier.processedThisFrame || barrier.nearMissTriggered) continue;
      if (barrier.lane !== playerLane) continue;

      const dz = Math.abs(playerZ - barrier.group.position.z);
      const isJumping = this.player.isJumping;
      
      if (dz < nearMissDist && !isJumping) {
        barrier.nearMissTriggered = true;
        results.nearMiss.push({ type: 'barrier', entity: barrier });
      }
    }
  }

  _sweepZOverlap(aZ, aPrevZ, bZ, bPrevZ, backMargin, frontMargin) {
    const aMin = Math.min(aZ, aPrevZ) + backMargin;
    const aMax = Math.max(aZ, aPrevZ) + frontMargin;
    const bMin = bZ + backMargin;
    const bMax = bZ + frontMargin;

    return aMin < bMax && aMax > bMin;
  }

  getDebugInfo() {
    if (!CONFIG.DEBUG_COLLISION) return '';

    const p = this.player;
    const lines = [
      `PLAYER`,
      `  Lane: ${p.lane}  Shape: ${p.currentShape}`,
      `  X: ${p.mesh.position.x.toFixed(2)}  Y: ${p.mesh.position.y.toFixed(2)}  Z: ${p.mesh.position.z.toFixed(2)}`,
      `  Jumping: ${p.isJumping}`
    ];

    const npcs = this.spawner.getActiveNPCs();
    for (const npc of npcs) {
      if (!npc.active) continue;
      const dz = Math.abs(p.mesh.position.z - npc.group.position.z);
      const sameLane = npc.lane === p.lane;
      const shapeMatch = npc.shape === p.currentShape;
      lines.push(`NPC Lane:${npc.lane} ${npc.shape} dz:${dz.toFixed(2)} sameLane:${sameLane} match:${shapeMatch} perfect:${npc.isPerfectCatch} nearMiss:${npc.nearMissTriggered}`);
    }

    const barriers = this.spawner.getActiveBarriers();
    for (const b of barriers) {
      if (!b.active) continue;
      const dz = Math.abs(p.mesh.position.z - b.group.position.z);
      const sameLane = b.lane === p.lane;
      lines.push(`BARRIER Lane:${b.lane} dz:${dz.toFixed(2)} sameLane:${sameLane} nearMiss:${b.nearMissTriggered}`);
    }

    return lines.join('\n');
  }
}
