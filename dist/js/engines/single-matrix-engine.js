import { PieceBag } from '../pieces.js';
import { cloneMatrix, createMatrix, occupiedCells, rotateClockwise } from '../matrix.js';
import { ENGINE_TYPES } from './engine-contract.js';

export class SingleMatrixEngine {
  constructor(onChange, random = Math.random) {
    this.type = ENGINE_TYPES.SINGLE_MATRIX;
    this.rows = 20;
    this.columns = 10;
    this.onChange = onChange;
    this.random = random;
    this.reset();
  }

  reset() {
    this.matrix = createMatrix(this.rows, this.columns);
    this.bag = new PieceBag(this.random);
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.isRunning = false;
    this.isGameOver = false;
    this.lastAction = 'spawn';
    this.lastDecision = { collision: false, probes: [], label: 'Matrix created' };
    this.lastTrace = { method: 'spawn', steps: [], highlights: [] };
    this.metrics = { reads: 0, writes: 0 };
    this.spawn();
    this.emit();
  }

  startOperation() {
    this.metrics = { reads: 0, writes: 0 };
  }

  spawn(preserveOutcome = false) {
    this.piece = this.bag.next();
    this.piece.x = Math.floor((this.columns - this.piece.matrix[0].length) / 2);
    this.piece.y = 0;
    const result = this.checkPlacement(this.piece.matrix, this.piece.x, this.piece.y);
    if (result.collision) {
      this.lastDecision = { ...result, label: 'The new piece collides when it spawns' };
      this.isGameOver = true;
      this.isRunning = false;
      this.lastAction = 'gameover';
      this.lastTrace = {
        method: 'spawn',
        steps: ['Get the next piece', 'Calculate the starting position', 'Detect a spawn collision', 'End the game'],
        highlights: ['this.bag.next()', 'this.checkPlacement', 'this.isGameOver = true']
      };
      return;
    }
    if (!preserveOutcome) {
    this.lastDecision = { ...result, label: 'Check spawn inside matrix' };
      this.lastAction = 'spawn';
      this.lastTrace = {
        method: 'spawn',
      steps: ['Get the next piece', 'Calculate the starting position', 'Validate occupied cells', 'Paint negative values'],
        highlights: ['this.bag.next()', 'this.checkPlacement', 'this.paintActive()']
      };
    }
    this.paintActive();
  }

  checkPlacement(pieceMatrix, targetX, targetY, track = true) {
    const probes = [];
    for (const { x: px, y: py } of occupiedCells(pieceMatrix)) {
      const x = targetX + px;
      const y = targetY + py;
      const outside = x < 0 || x >= this.columns || y < 0 || y >= this.rows;
      let occupied = false;
      if (!outside) {
        if (track) this.metrics.reads++;
        occupied = this.matrix[y][x] > 0;
      }
      probes.push({ x, y, collision: outside || occupied });
      if (outside || occupied) return { collision: true, probes };
    }
    return { collision: false, probes };
  }

  eraseActive() {
    for (const { x: px, y: py } of occupiedCells(this.piece.matrix)) {
      const x = this.piece.x + px;
      const y = this.piece.y + py;
      if (y >= 0 && this.matrix[y][x] < 0) {
        this.matrix[y][x] = 0;
        this.metrics.writes++;
      }
    }
  }

  paintActive() {
    for (const { x: px, y: py } of occupiedCells(this.piece.matrix)) {
      const x = this.piece.x + px;
      const y = this.piece.y + py;
      if (y >= 0) {
        this.matrix[y][x] = -this.piece.id;
        this.metrics.writes++;
      }
    }
  }

  lockCurrent() {
    for (const { x: px, y: py } of occupiedCells(this.piece.matrix)) {
      const x = this.piece.x + px;
      const y = this.piece.y + py;
      if (y >= 0) {
        this.matrix[y][x] = this.piece.id;
        this.metrics.writes++;
      }
    }
  }

  step() {
    if (this.isGameOver) return;
    this.startOperation();
    this.eraseActive();
    const result = this.checkPlacement(this.piece.matrix, this.piece.x, this.piece.y + 1);
    this.lastDecision = { ...result, label: 'Erase → check Y + 1 → redraw' };
    this.lastAction = 'step';
    this.lastTrace = {
      method: 'step',
      steps: result.collision
      ? ['Erase the active piece', 'Check position Y + 1', 'Detect the lower collision', 'Lock the piece and create the next one']
      : ['Erase the active piece', 'Check position Y + 1', 'Increment piece.y', 'Paint the piece again'],
      highlights: result.collision
        ? ['this.eraseActive()', 'this.checkPlacement', 'this.settleCurrent()']
        : ['this.eraseActive()', 'this.checkPlacement', 'this.piece.y++', 'this.paintActive()']
    };
    if (!result.collision) {
      this.piece.y++;
      this.paintActive();
    } else {
      this.settleCurrent();
    }
    this.emit();
  }

  move(dx) {
    if (this.isGameOver) return;
    this.startOperation();
    this.eraseActive();
    const result = this.checkPlacement(this.piece.matrix, this.piece.x + dx, this.piece.y);
    this.lastDecision = { ...result, label: `Erase → check X ${dx < 0 ? '−' : '+'} 1 → redraw` };
    this.lastAction = 'move';
    this.lastTrace = {
      method: 'move',
      steps: result.collision
      ? ['Erase the active piece', 'Check the new X position', 'Reject the movement', 'Restore the piece']
      : ['Erase the active piece', 'Check the new X position', 'Update piece.x', 'Paint the piece again'],
      highlights: ['this.eraseActive()', 'this.checkPlacement', 'this.piece.x += dx', 'this.paintActive()']
    };
    if (!result.collision) this.piece.x += dx;
    this.paintActive();
    this.emit();
  }

  rotate() {
    if (this.isGameOver) return;
    this.startOperation();
    this.eraseActive();
    const rotated = rotateClockwise(this.piece.matrix);
    let accepted = false;
    for (const kick of [0, -1, 1, -2, 2]) {
      const result = this.checkPlacement(rotated, this.piece.x + kick, this.piece.y);
    this.lastDecision = { ...result, label: `Rotate the full matrix + X adjustment=${kick}` };
      if (!result.collision) {
        this.piece.matrix = rotated;
        this.piece.x += kick;
        accepted = true;
        break;
      }
    }
    this.lastAction = 'rotate';
    this.lastDecision.label = accepted ? 'Rotation written to matrix' : 'Rotation rejected; restore the piece';
    this.lastTrace = {
      method: 'rotate',
      steps: accepted
      ? ['Erase the active piece', 'Rotate the local matrix', 'Try wall kicks', 'Accept and paint the rotation']
      : ['Erase the active piece', 'Rotate the local matrix', 'Try all wall kicks', 'Restore the previous orientation'],
      highlights: ['this.eraseActive()', 'rotateClockwise', 'this.checkPlacement', 'this.piece.matrix = rotated', 'this.paintActive()']
    };
    this.paintActive();
    this.emit();
  }

  hardDrop() {
    if (this.isGameOver) return;
    this.startOperation();
    this.eraseActive();
    let distance = 0;
    let result;
    do {
      result = this.checkPlacement(this.piece.matrix, this.piece.x, this.piece.y + distance + 1);
      if (!result.collision) distance++;
    } while (!result.collision);
    this.piece.y += distance;
    this.score += distance * 2;
    this.lastDecision = { ...result, label: `Hard drop by ${distance} row(s)` };
    this.lastAction = 'hardDrop';
    this.lastTrace = {
      method: 'hardDrop',
      steps: ['Erase the active piece', 'Check lower positions until collision', `Advance ${distance} row(s)`, 'Lock the piece and create the next one'],
      highlights: ['this.eraseActive()', 'this.checkPlacement', 'this.piece.y += distance', 'this.settleCurrent()']
    };
    this.settleCurrent();
    this.emit();
  }

  settleCurrent() {
    this.lockCurrent();
    const cleared = this.clearCompletedRows();
    if (cleared > 0) {
      this.lines += cleared;
      this.score += [0, 100, 300, 500, 800][cleared] * this.level;
      this.level = Math.floor(this.lines / 10) + 1;
      this.lastAction = 'clear';
    this.lastDecision.label = `${cleared} row(s): copy upper rows downward`;
      this.lastTrace = {
        method: 'clearCompletedRows',
      steps: [`Detect ${cleared} completed row(s)`, 'Copy every upper row downward', 'Clear the first row', 'Update lines, score, and level'],
        highlights: ['if (!full) continue', 'this.matrix[target][column]', 'this.matrix[0].fill(0)', 'cleared++']
      };
    }
    this.spawn(true);
  }

  clearCompletedRows() {
    let cleared = 0;
    for (let row = this.rows - 1; row >= 0; row--) {
      let full = true;
      for (let column = 0; column < this.columns; column++) {
        this.metrics.reads++;
        if (this.matrix[row][column] === 0) { full = false; break; }
      }
      if (!full) continue;
      for (let target = row; target > 0; target--) {
        for (let column = 0; column < this.columns; column++) {
          this.matrix[target][column] = this.matrix[target - 1][column];
          this.metrics.reads++;
          this.metrics.writes++;
        }
      }
      this.matrix[0].fill(0);
      this.metrics.writes += this.columns;
      cleared++;
      row++;
    }
    return cleared;
  }

  ghostY() {
    let distance = 0;
    while (!this.checkPlacement(this.piece.matrix, this.piece.x, this.piece.y + distance + 1, false).collision) distance++;
    return this.piece.y + distance;
  }

  getVisibleMatrix() {
    return cloneMatrix(this.matrix);
  }

  emit() { this.onChange?.(this); }
}
