import { rulesScene } from './rulesScene.js';

export const titleScene = {
  init(game) {
    this.start = () => {
      window.removeEventListener('keydown', this.start);
      window.removeEventListener('click', this.start);
      game.switchScene(rulesScene);
    };
    window.addEventListener('keydown', this.start);
    window.addEventListener('click', this.start);
  },

  destroy() {
    window.removeEventListener('keydown', this.start);
    window.removeEventListener('click', this.start);
  },

  render(ctx, game) {
    const { width, height } = game;
    ctx.fillStyle = '#16171d';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#f3f4f6';
    ctx.textAlign = 'center';
    ctx.font = 'bold 40px sans-serif';
    ctx.fillText('数字カードバトル', width / 2, height / 2 - 20);

    ctx.font = '18px sans-serif';
    ctx.fillText('press any key or tap to start', width / 2, height / 2 + 20);
  },
};
