import { startLoop } from './loop.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.scene = null;
  }

  switchScene(scene) {
    this.scene = scene;
    this.scene.init?.(this);
  }

  start(initialScene) {
    this.switchScene(initialScene);
    startLoop({
      update: (dt) => this.scene.update?.(dt, this),
      render: () => {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.scene.render?.(this.ctx, this);
      },
    });
  }
}
