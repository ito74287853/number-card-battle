import { startLoop } from './loop.js';

export class Game {
  constructor(canvas, { width, height }) {
    this.canvas = canvas;
    this.width = width;
    this.height = height;
    this.ctx = canvas.getContext('2d');
    this.scene = null;
    this.applyResolution();
  }

  applyResolution() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  switchScene(scene) {
    this.scene?.destroy?.(this);
    this.scene = scene;
    this.scene.init?.(this);
  }

  start(initialScene) {
    this.switchScene(initialScene);
    startLoop({
      update: (dt) => this.scene.update?.(dt, this),
      render: () => {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.scene.render?.(this.ctx, this);
      },
    });
  }
}
