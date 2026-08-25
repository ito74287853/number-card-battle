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

export function enemyHpRangeForRound(round) {
  return {
    min: 12 + (round - 1) * 4,
    max: 20 + (round - 1) * 5,
  };
}

export function rollRewardOptions(count = 3, { min = 5, max = 12 } = {}) {
  return Array.from({ length: count }, () => new Card(nextCardId++, randomInt(min, max)));
}
