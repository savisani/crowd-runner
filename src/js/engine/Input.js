export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchStartTime = 0;
    this.isTouching = false;
    this.swipeThreshold = 30;
    this.tapThreshold = 15;
    this.callbacks = {
      swipeLeft: null,
      swipeRight: null,
      swipeUp: null,
      tap: null
    };

    this._onTouchStart = this._onTouchStart.bind(this);
    this._onTouchEnd = this._onTouchEnd.bind(this);
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);

    canvas.addEventListener('touchstart', this._onTouchStart, { passive: false });
    canvas.addEventListener('touchend', this._onTouchEnd, { passive: false });
    canvas.addEventListener('mousedown', this._onMouseDown);
    canvas.addEventListener('mouseup', this._onMouseUp);
  }

  on(event, callback) {
    if (this.callbacks.hasOwnProperty(event)) {
      this.callbacks[event] = callback;
    }
  }

  _onTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    this.touchStartTime = Date.now();
    this.isTouching = true;
  }

  _onTouchEnd(e) {
    e.preventDefault();
    if (!this.isTouching) return;
    this.isTouching = false;
    const touch = e.changedTouches[0];
    this._processInput(touch.clientX, touch.clientY);
  }

  _onMouseDown(e) {
    this.touchStartX = e.clientX;
    this.touchStartY = e.clientY;
    this.touchStartTime = Date.now();
    this.isTouching = true;
  }

  _onMouseUp(e) {
    if (!this.isTouching) return;
    this.isTouching = false;
    this._processInput(e.clientX, e.clientY);
  }

  _processInput(endX, endY) {
    const dx = endX - this.touchStartX;
    const dy = endY - this.touchStartY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const elapsed = Date.now() - this.touchStartTime;

    if (dist < this.tapThreshold && elapsed < 300) {
      if (this.callbacks.tap) this.callbacks.tap();
      return;
    }

    if (dist < this.swipeThreshold) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) {
        if (this.callbacks.swipeLeft) this.callbacks.swipeLeft();
      } else {
        if (this.callbacks.swipeRight) this.callbacks.swipeRight();
      }
    } else {
      if (dy < 0) {
        if (this.callbacks.swipeUp) this.callbacks.swipeUp();
      }
    }
  }

  destroy() {
    this.canvas.removeEventListener('touchstart', this._onTouchStart);
    this.canvas.removeEventListener('touchend', this._onTouchEnd);
    this.canvas.removeEventListener('mousedown', this._onMouseDown);
    this.canvas.removeEventListener('mouseup', this._onMouseUp);
  }
}
