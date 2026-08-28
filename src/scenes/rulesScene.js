import { battleScene } from './battleScene.js';

const LINES = [
  '・カードを使うと、その数字がそのままダメージになり敵HPを削ります',
  '・敵は複数体並ぶことがあり、先頭の敵から順番に倒していきます',
  '・全ての敵を倒せばラウンド勝利。手札を使い切って倒しきれなければ敗北です',
  '・勝利後は報酬カード3枚から1枚を選んでデッキに追加できます（スキップも可）',
  '・5ラウンド勝ち抜けばクリア。負けたら最初からやり直しです',
  '・勝った時の超過ダメージは累積し、上限を超えると「使いすぎ」で自滅します',
];

export const rulesScene = {
  init(game) {
    // titleScene と同じ理由で、click は canvas に登録する（iOS 対策）
    this.canvas = game.canvas;
    this.start = () => {
      window.removeEventListener('keydown', this.start);
      this.canvas.removeEventListener('click', this.start);
      game.switchScene(battleScene);
    };
    window.addEventListener('keydown', this.start);
    this.canvas.addEventListener('click', this.start);
  },

  destroy() {
    window.removeEventListener('keydown', this.start);
    this.canvas.removeEventListener('click', this.start);
  },

  render(ctx, game) {
    const { width, height } = game;
    ctx.fillStyle = '#16171d';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#f3f4f6';
    ctx.textAlign = 'center';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText('遊び方', width / 2, 55);

    ctx.textAlign = 'left';
    ctx.font = '15px sans-serif';
    ctx.fillStyle = '#d1d5db';
    LINES.forEach((line, i) => {
      ctx.fillText(line, 45, 110 + i * 34);
    });

    ctx.textAlign = 'center';
    ctx.fillStyle = '#9ca3af';
    ctx.font = '13px sans-serif';
    ctx.fillText(
      '操作: カードはタップ / 数字キー、決定はクリック・Enter・Space',
      width / 2,
      110 + LINES.length * 34 + 28
    );

    ctx.fillStyle = '#c084fc';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('クリック・Enter・Space でバトル開始', width / 2, height - 30);
  },
};
