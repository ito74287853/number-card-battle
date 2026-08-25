export const CARD_WIDTH = 70;
export const CARD_HEIGHT = 100;

export class Card {
  constructor(id, value) {
    this.id = id;
    this.value = value;
  }

  render(ctx, x, y, selected) {
    ctx.fillStyle = selected ? '#3a2a52' : '#1f2028';
    ctx.strokeStyle = selected ? '#c084fc' : '#2e303a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, CARD_WIDTH, CARD_HEIGHT, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f3f4f6';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(this.value), x + CARD_WIDTH / 2, y + CARD_HEIGHT / 2);
    ctx.textBaseline = 'alphabetic';
  }
}
