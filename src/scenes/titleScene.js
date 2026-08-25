import { battleScene } from './battleScene.js';

export const titleScene = {
  init(game) {
    this.onKeyDown = () => game.switchScene(battleScene);
    window.addEventListener('keydown', this.onKeyDown, { once: true });
    window.addEventListener('click', this.onKeyDown, { once: true });
  },

  render(ctx, game) {
    const { width, height } = game.canvas;
    ctx.fillStyle = '#16171d';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#f3f4f6';
    ctx.textAlign = 'center';
    ctx.font = 'bold 40px sans-serif';
    ctx.fillText('数字カードバトル', width / 2, height / 2 - 20);

    ctx.font = '18px sans-serif';
    ctx.fillText('press any key to start', width / 2, height / 2 + 20);
  },
};
