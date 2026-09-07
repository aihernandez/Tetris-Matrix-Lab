export const PIECES = {
  I: { id: 1, color: '#38d6e8', matrix: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]] },
  J: { id: 2, color: '#5b7cfa', matrix: [[1,0,0],[1,1,1],[0,0,0]] },
  L: { id: 3, color: '#ff9f43', matrix: [[0,0,1],[1,1,1],[0,0,0]] },
  O: { id: 4, color: '#ffd166', matrix: [[1,1],[1,1]] },
  S: { id: 5, color: '#62e66f', matrix: [[0,1,1],[1,1,0],[0,0,0]] },
  T: { id: 6, color: '#b56cff', matrix: [[0,1,0],[1,1,1],[0,0,0]] },
  Z: { id: 7, color: '#ff5c72', matrix: [[1,1,0],[0,1,1],[0,0,0]] }
};

export const COLORS_BY_ID = Object.fromEntries(
  Object.values(PIECES).map(piece => [piece.id, piece.color])
);

export class PieceBag {
  constructor(random = Math.random) {
    this.random = random;
    this.queue = [];
  }

  next() {
    if (this.queue.length === 0) {
      this.queue = Object.keys(PIECES);
      for (let i = this.queue.length - 1; i > 0; i--) {
        const j = Math.floor(this.random() * (i + 1));
        [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
      }
    }
    const name = this.queue.pop();
    const definition = PIECES[name];
    return {
      name,
      id: definition.id,
      color: definition.color,
      matrix: definition.matrix.map(row => [...row]),
      x: 0,
      y: 0
    };
  }
}
