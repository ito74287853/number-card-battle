import { CARD_WIDTH, CARD_HEIGHT } from '../entities/card.js';
import { createBaseDeck, drawHand, rollEnemiesForRound, rollRewardOptions } from '../utils/deck.js';
import { pointInRect } from '../utils/collision.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../core/config.js';

const ROUND_COUNT = 5;
const HAND_SIZE = 5;
// 勝利時の超過分（totalPlayed - enemiesTotalMaxHp）を積算し、これを超えると自滅する。初期値は仮置きでプレイして調整する。
const OVERFLOW_BUST_CAP = 20;
const CARD_GAP = 12;
const CARD_Y = 190;
const ACTION_BUTTON = { x: GAME_WIDTH / 2 - 70, y: GAME_HEIGHT / 2 + 36, width: 140, height: 40 };
const SKIP_BUTTON = { x: GAME_WIDTH / 2 - 70, y: CARD_Y + CARD_HEIGHT + 30, width: 140, height: 40 };

export const battleScene = {
  init(game) {
    this.canvas = game.canvas;
    this.handleClick = (e) => this.onClick(e);
    this.handleMouseMove = (e) => this.onMouseMove(e);
    this.handleKeyDown = (e) => this.onKeyDown(e);
    this.canvas.addEventListener('click', this.handleClick);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('keydown', this.handleKeyDown);
    this.hoverIndex = -1;
    this.startRun();
  },

  destroy() {
    this.canvas.removeEventListener('click', this.handleClick);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('keydown', this.handleKeyDown);
  },

  startRun() {
    this.deck = createBaseDeck();
    this.round = 1;
    this.totalOverflow = 0;
    this.startBattle();
  },

  startBattle() {
    this.enemies = rollEnemiesForRound(this.round);
    this.enemiesTotalMaxHp = this.enemies.reduce((sum, e) => sum + e.maxHp, 0);
    this.hand = drawHand(this.deck, HAND_SIZE);
    this.playedCards = new Set();
    this.phase = 'selecting';
    this.overflow = 0;
    this.roundWon = false;
  },

  get totalPlayed() {
    let sum = 0;
    for (const i of this.playedCards) sum += this.hand[i].value;
    return sum;
  },

  get outcome() {
    if (!this.roundWon) return 'lose';
    if (this.totalOverflow > OVERFLOW_BUST_CAP) return 'burst';
    return 'win';
  },

  getCardRect(index) {
    const handLength = this.hand.length;
    const totalWidth = handLength * CARD_WIDTH + (handLength - 1) * CARD_GAP;
    const startX = GAME_WIDTH / 2 - totalWidth / 2;
    return {
      x: startX + index * (CARD_WIDTH + CARD_GAP),
      y: CARD_Y,
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
    };
  },

  getRewardCardRect(index) {
    const totalWidth = this.rewardOptions.length * CARD_WIDTH + (this.rewardOptions.length - 1) * CARD_GAP;
    const startX = GAME_WIDTH / 2 - totalWidth / 2;
    return {
      x: startX + index * (CARD_WIDTH + CARD_GAP),
      y: CARD_Y,
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
    };
  },

  toLogicalPoint(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (GAME_WIDTH / rect.width),
      y: (e.clientY - rect.top) * (GAME_HEIGHT / rect.height),
    };
  },

  onMouseMove(e) {
    if (this.phase !== 'reward') return;
    const { x, y } = this.toLogicalPoint(e);
    this.hoverIndex = this.rewardOptions.findIndex((_, i) => pointInRect(x, y, this.getRewardCardRect(i)));
  },

  playCard(index) {
    if (index < 0 || index >= this.hand.length || this.playedCards.has(index)) return;
    this.playedCards.add(index);
    this.enemies[0].hp -= this.hand[index].value;
    if (this.enemies[0].hp <= 0) this.enemies.shift();

    if (this.enemies.length === 0) {
      this.overflow = this.totalPlayed - this.enemiesTotalMaxHp;
      this.totalOverflow += this.overflow;
      this.roundWon = true;
      this.phase = 'battleResult';
      return;
    }

    if (this.playedCards.size === this.hand.length) {
      this.overflow = this.totalPlayed - this.enemiesTotalMaxHp;
      this.roundWon = false;
      this.phase = 'battleResult';
    }
  },

  confirmBattleResult() {
    if (this.outcome === 'win' && this.round < ROUND_COUNT) {
      this.rewardOptions = rollRewardOptions(3);
      this.hoverIndex = -1;
      this.phase = 'reward';
    } else {
      this.startRun();
    }
  },

  pickReward(index) {
    if (index < 0 || index >= this.rewardOptions.length) return;
    this.deck.push(this.rewardOptions[index]);
    this.round += 1;
    this.startBattle();
  },

  skipReward() {
    this.round += 1;
    this.startBattle();
  },

  onClick(e) {
    const { x, y } = this.toLogicalPoint(e);

    if (this.phase === 'selecting') {
      for (let i = 0; i < this.hand.length; i++) {
        if (pointInRect(x, y, this.getCardRect(i))) {
          this.playCard(i);
          return;
        }
      }
    } else if (this.phase === 'battleResult') {
      if (pointInRect(x, y, ACTION_BUTTON)) {
        this.confirmBattleResult();
      }
    } else if (this.phase === 'reward') {
      for (let i = 0; i < this.rewardOptions.length; i++) {
        if (pointInRect(x, y, this.getRewardCardRect(i))) {
          this.pickReward(i);
          return;
        }
      }
      if (pointInRect(x, y, SKIP_BUTTON)) {
        this.skipReward();
      }
    }
  },

  onKeyDown(e) {
    if (e.repeat) return; // 押しっぱなしの連射で画面が1つ飛ぶのを防ぐ
    if (e.key === ' ') e.preventDefault(); // ページスクロールを防ぐ（現状は無害だが将来のレイアウト変更に備える）

    if (this.phase === 'selecting') {
      const num = Number(e.key);
      if (Number.isInteger(num) && num >= 1 && num <= this.hand.length) {
        this.playCard(num - 1);
      }
    } else if (this.phase === 'battleResult') {
      if (e.key === 'Enter' || e.key === ' ') {
        this.confirmBattleResult();
      }
    } else if (this.phase === 'reward') {
      const num = Number(e.key);
      if (Number.isInteger(num) && num >= 1 && num <= this.rewardOptions.length) {
        this.pickReward(num - 1);
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        this.skipReward();
      }
    }
  },

  render(ctx, game) {
    const { width, height } = game;

    if (this.phase === 'reward') {
      this.renderReward(ctx, width, height);
      return;
    }
    if (this.phase === 'battleResult') {
      this.renderBattleResult(ctx, width, height);
      return;
    }

    ctx.fillStyle = '#16171d';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#9ca3af';
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`ROUND ${this.round} / ${ROUND_COUNT}`, width / 2, 30);

    this.renderEnemyQueue(ctx, width);

    ctx.fillStyle = '#9ca3af';
    ctx.font = '14px sans-serif';
    ctx.fillText(`累積超過: ${this.totalOverflow} / ${OVERFLOW_BUST_CAP}`, width / 2, 168);

    this.hand.forEach((card, i) => {
      const r = this.getCardRect(i);
      card.render(ctx, r.x, r.y, false, this.playedCards.has(i));
    });

    ctx.fillStyle = '#6b7280';
    ctx.font = '13px sans-serif';
    ctx.fillText('カードをタップ/数字キーで使用。先頭の敵から倒し、全滅させれば勝利', width / 2, height - 20);
  },

  renderEnemyQueue(ctx, width) {
    const startY = 95;
    const frontW = 130;
    const frontH = 56;
    const waitW = 70;
    const waitH = 40;
    const gap = 14;

    let totalWidth = frontW;
    for (let i = 1; i < this.enemies.length; i++) totalWidth += gap + waitW;
    let x = width / 2 - totalWidth / 2;

    const front = this.enemies[0];
    ctx.fillStyle = '#2a2130';
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, startY, frontW, frontH, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f3f4f6';
    ctx.textAlign = 'center';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(`${Math.max(front.hp, 0)} / ${front.maxHp}`, x + frontW / 2, startY + frontH / 2 + 8);
    x += frontW + gap;

    for (let i = 1; i < this.enemies.length; i++) {
      const enemy = this.enemies[i];
      const y = startY + (frontH - waitH) / 2;
      ctx.fillStyle = '#1f2028';
      ctx.strokeStyle = '#3a3a42';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x, y, waitW, waitH, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#9ca3af';
      ctx.font = '14px sans-serif';
      ctx.fillText(`${enemy.maxHp}`, x + waitW / 2, y + waitH / 2 + 5);
      x += waitW + gap;
    }
  },

  renderBattleResult(ctx, width, height) {
    // battleResult owns the whole screen so the WIN/LOSE text never has to
    // share space with (or show through) the hand underneath.
    ctx.fillStyle = '#16171d';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#9ca3af';
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`ROUND ${this.round} / ${ROUND_COUNT}`, width / 2, 30);

    const outcome = this.outcome;
    const cleared = outcome === 'win' && this.round === ROUND_COUNT;
    const color = { win: '#4ade80', lose: '#f87171', burst: '#fb923c' }[outcome];
    const titleText = cleared
      ? `${ROUND_COUNT}ラウンド制覇！`
      : { win: 'WIN!', lose: 'LOSE...', burst: '使いすぎで自滅…' }[outcome];

    ctx.fillStyle = cleared ? '#facc15' : color;
    ctx.font = cleared ? 'bold 36px sans-serif' : outcome === 'burst' ? 'bold 32px sans-serif' : 'bold 48px sans-serif';
    ctx.fillText(titleText, width / 2, height / 2 - 45);

    ctx.fillStyle = '#f3f4f6';
    ctx.font = '18px sans-serif';
    ctx.fillText(`合計 ${this.totalPlayed} / 敵HP合計 ${this.enemiesTotalMaxHp}`, width / 2, height / 2 - 10);

    ctx.fillStyle = color;
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(
      `超過分: ${this.overflow >= 0 ? '+' : ''}${this.overflow}　累積超過: ${this.totalOverflow} / ${OVERFLOW_BUST_CAP}`,
      width / 2,
      height / 2 + 18
    );

    const label = outcome === 'win' && this.round < ROUND_COUNT ? '次のラウンドへ' : '最初から';
    this.renderButton(ctx, ACTION_BUTTON, label, true);

    ctx.fillStyle = '#6b7280';
    ctx.font = '13px sans-serif';
    ctx.fillText('Enter/Space: 進む', width / 2, height - 20);
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
      card.render(ctx, r.x, r.y, i === this.hoverIndex, false);
    });

    this.renderButton(ctx, SKIP_BUTTON, 'スキップ', true);

    ctx.fillStyle = '#6b7280';
    ctx.font = '13px sans-serif';
    ctx.fillText('数字キー: カード選択　Enter/Space: スキップ', width / 2, height - 20);
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
