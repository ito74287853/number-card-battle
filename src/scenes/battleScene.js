import { CARD_WIDTH, CARD_HEIGHT } from '../entities/card.js';
import { createBaseDeck, drawHand, rollEnemyHp, enemyHpRangeForRound, rollRewardOptions } from '../utils/deck.js';
import { pointInRect } from '../utils/collision.js';

const ROUND_COUNT = 5;
const HAND_SIZE = 5;
const CARD_GAP = 12;
const CARD_Y = 190;
const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;
const CONFIRM_BUTTON = { x: CANVAS_WIDTH / 2 - 70, y: 320, width: 140, height: 44 };
const ACTION_BUTTON = { x: CANVAS_WIDTH / 2 - 70, y: CANVAS_HEIGHT / 2 + 36, width: 140, height: 40 };

export const battleScene = {
  init(game) {
    this.canvas = game.canvas;
    this.handleClick = (e) => this.onClick(e);
    this.canvas.addEventListener('click', this.handleClick);
    this.startRun();
  },

  startRun() {
    this.deck = createBaseDeck();
    this.round = 1;
    this.startBattle();
  },

  startBattle() {
    const { min, max } = enemyHpRangeForRound(this.round);
    this.enemyHp = rollEnemyHp(min, max);
    this.hand = drawHand(this.deck, HAND_SIZE);
    this.selected = new Set();
    this.phase = 'selecting';
    this.overflow = 0;
  },

  get total() {
    let sum = 0;
    for (const i of this.selected) sum += this.hand[i].value;
    return sum;
  },

  get win() {
    return this.overflow >= 0;
  },

  getCardRect(index) {
    const handLength = this.hand.length;
    const totalWidth = handLength * CARD_WIDTH + (handLength - 1) * CARD_GAP;
    const startX = CANVAS_WIDTH / 2 - totalWidth / 2;
    return {
      x: startX + index * (CARD_WIDTH + CARD_GAP),
      y: this.selected.has(index) ? CARD_Y - 15 : CARD_Y,
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
    };
  },

  getRewardCardRect(index) {
    const totalWidth = this.rewardOptions.length * CARD_WIDTH + (this.rewardOptions.length - 1) * CARD_GAP;
    const startX = CANVAS_WIDTH / 2 - totalWidth / 2;
    return {
      x: startX + index * (CARD_WIDTH + CARD_GAP),
      y: CARD_Y,
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
    };
  },

  onClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (this.phase === 'selecting') {
      for (let i = 0; i < this.hand.length; i++) {
        if (pointInRect(x, y, this.getCardRect(i))) {
          if (this.selected.has(i)) this.selected.delete(i);
          else this.selected.add(i);
          return;
        }
      }
      if (this.selected.size > 0 && pointInRect(x, y, CONFIRM_BUTTON)) {
        this.overflow = this.total - this.enemyHp;
        this.phase = 'battleResult';
      }
    } else if (this.phase === 'battleResult') {
      if (pointInRect(x, y, ACTION_BUTTON)) {
        if (this.win && this.round < ROUND_COUNT) {
          this.rewardOptions = rollRewardOptions(3);
          this.phase = 'reward';
        } else {
          this.startRun();
        }
      }
    } else if (this.phase === 'reward') {
      for (let i = 0; i < this.rewardOptions.length; i++) {
        if (pointInRect(x, y, this.getRewardCardRect(i))) {
          this.deck.push(this.rewardOptions[i]);
          this.round += 1;
          this.startBattle();
          return;
        }
      }
    }
  },

  render(ctx, game) {
    const { width, height } = game.canvas;

    if (this.phase === 'reward') {
      this.renderReward(ctx, width, height);
      return;
    }

    ctx.fillStyle = '#16171d';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#9ca3af';
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`ROUND ${this.round} / ${ROUND_COUNT}`, width / 2, 30);

    ctx.fillStyle = '#f3f4f6';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText(`敵 HP: ${this.enemyHp}`, width / 2, 65);

    ctx.font = '20px sans-serif';
    ctx.fillText(`合計: ${this.total}`, width / 2, 110);

    this.hand.forEach((card, i) => {
      const r = this.getCardRect(i);
      card.render(ctx, r.x, r.y, this.selected.has(i));
    });

    this.renderButton(ctx, CONFIRM_BUTTON, '勝負', this.selected.size > 0);

    if (this.phase === 'battleResult') {
      const cleared = this.win && this.round === ROUND_COUNT;

      ctx.fillStyle = 'rgba(10, 10, 14, 0.92)';
      ctx.fillRect(0, 0, width, height);

      const titleText = cleared ? `${ROUND_COUNT}ラウンド制覇！` : this.win ? 'WIN!' : 'LOSE...';
      ctx.fillStyle = cleared ? '#facc15' : this.win ? '#4ade80' : '#f87171';
      ctx.font = cleared ? 'bold 36px sans-serif' : 'bold 48px sans-serif';
      ctx.fillText(titleText, width / 2, height / 2 - 45);

      ctx.fillStyle = '#f3f4f6';
      ctx.font = '18px sans-serif';
      ctx.fillText(`合計 ${this.total} / 敵HP ${this.enemyHp}`, width / 2, height / 2 - 10);

      ctx.fillStyle = this.win ? '#4ade80' : '#f87171';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(`超過分: ${this.overflow >= 0 ? '+' : ''}${this.overflow}`, width / 2, height / 2 + 18);

      const label = this.win && this.round < ROUND_COUNT ? '次のラウンドへ' : '最初から';
      this.renderButton(ctx, ACTION_BUTTON, label, true);
    }
  },

  renderReward(ctx, width, height) {
    ctx.fillStyle = '#16171d';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#f3f4f6';
    ctx.textAlign = 'center';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('カードを1枚選んでデッキに加えよう', width / 2, 100);

    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#9ca3af';
    ctx.fillText(`ROUND ${this.round} クリア`, width / 2, 130);

    this.rewardOptions.forEach((card, i) => {
      const r = this.getRewardCardRect(i);
      card.render(ctx, r.x, r.y, false);
    });
  },

  renderButton(ctx, rect, label, enabled) {
    ctx.fillStyle = enabled ? '#c084fc' : '#3a3a42';
    ctx.beginPath();
    ctx.roundRect(rect.x, rect.y, rect.width, rect.height, 8);
    ctx.fill();

    ctx.fillStyle = enabled ? '#16171d' : '#6b7280';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, rect.x + rect.width / 2, rect.y + rect.height / 2);
    ctx.textBaseline = 'alphabetic';
  },
};
