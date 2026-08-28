import { Card } from '../entities/card.js';

let nextCardId = 0;

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffled(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function createBaseDeck(size = 5, { min = 1, max = 9 } = {}) {
  return Array.from({ length: size }, () => new Card(nextCardId++, randomInt(min, max)));
}

export function drawHand(deck, size = 5) {
  return shuffled(deck).slice(0, size);
}

export function rollEnemyHp(min = 12, max = 30) {
  return randomInt(min, max);
}

// ラウンド全体で必要な合計HP（複数体になっても難易度カーブが急変しないよう、
// まずラウンド全体の目標値を決めてから体数で割る）
function totalHpRangeForRound(round) {
  return {
    min: 10 + (round - 1) * 3,
    max: 16 + (round - 1) * 4,
  };
}

// ラウンドごとの敵の体数。初期値は仮置きでプレイして調整する
export function enemyCountForRound(round) {
  return Math.min(1 + Math.floor((round - 1) / 2), 3);
}

// 敵1体あたりのHPレンジ（ラウンド合計を体数で割った値）
export function enemyHpRangeForRound(round) {
  const { min, max } = totalHpRangeForRound(round);
  const count = enemyCountForRound(round);
  return {
    min: Math.round(min / count),
    max: Math.round(max / count),
  };
}

export function rollEnemiesForRound(round) {
  const { min, max } = enemyHpRangeForRound(round);
  return Array.from({ length: enemyCountForRound(round) }, () => {
    const maxHp = rollEnemyHp(min, max);
    return { maxHp, hp: maxHp };
  });
}

export function rollRewardOptions(count = 3, { min = 5, max = 12 } = {}) {
  return Array.from({ length: count }, () => new Card(nextCardId++, randomInt(min, max)));
}
