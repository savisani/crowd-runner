import * as THREE from 'three';

export class ObjectPool {
  constructor(createFn, resetFn, initialSize = 20) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.pool = [];
    this.active = [];
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(createFn());
    }
  }

  get() {
    const obj = this.pool.length > 0 ? this.pool.pop() : this.createFn();
    this.active.push(obj);
    return obj;
  }

  release(obj) {
    const idx = this.active.indexOf(obj);
    if (idx !== -1) {
      this.active.splice(idx, 1);
      this.resetFn(obj);
      this.pool.push(obj);
    }
  }

  releaseAll() {
    while (this.active.length > 0) {
      this.release(this.active[0]);
    }
  }

  getActive() {
    return this.active;
  }

  get activeCount() {
    return this.active.length;
  }
}

export class PoolManager {
  constructor() {
    this.pools = new Map();
  }

  createPool(name, createFn, resetFn, initialSize = 20) {
    const pool = new ObjectPool(createFn, resetFn, initialSize);
    this.pools.set(name, pool);
    return pool;
  }

  getPool(name) {
    return this.pools.get(name);
  }

  releaseAll() {
    for (const pool of this.pools.values()) {
      pool.releaseAll();
    }
  }
}
