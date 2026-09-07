import { PieceBag } from '../pieces.js';
import { cloneMatrix, createMatrix, occupiedCells, rotateClockwise } from '../matrix.js';
import { ENGINE_TYPES } from './engine-contract.js';

export class LayeredMatrixEngine {
  constructor(onChange, random = Math.random) {
    this.type = ENGINE_TYPES.LAYERED_MATRIX;
    this.rows = 20;
    this.columns = 10;
    this.onChange = onChange;
    this.random = random;
    this.reset();
  }

  reset() {
    this.board = createMatrix(this.rows, this.columns);
    this.bag = new PieceBag(this.random);
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.isRunning = false;
    this.isGameOver = false;
    this.lastAction = 'spawn';
    this.lastDecision = { collision: false, probes: [], label: 'Layers created' };
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
        steps: ['Get the next piece', 'Calculate the starting position', 'Detect a collision on board', 'End the game'],
        highlights: ['this.bag.next()', 'this.checkPlacement', 'this.isGameOver = true']
      };
      return;
    }
    if (!preserveOutcome) {
    this.lastDecision = { ...result, label: 'Project piece onto board' };
      this.lastAction = 'spawn';
      this.lastTrace = {
        method: 'spawn',
      steps: ['Get the next piece', 'Calculate the starting position', 'Validate cells on board', 'Keep the piece in a separate layer'],
        highlights: ['this.bag.next()', 'this.checkPlacement']
      };
    }
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
        occupied = this.board[y][x] !== 0;
      }
      probes.push({ x, y, collision: outside || occupied });
      if (outside || occupied) return { collision: true, probes };
    }
    return { collision: false, probes };
  }

  step() {
    if (this.isGameOver) return;
    this.startOperation();
    const result = this.checkPlacement(this.piece.matrix, this.piece.x, this.piece.y + 1);
    this.lastDecision = { ...result, label: 'Check Y + 1; board stays unchanged' };
    this.lastAction = 'step';
    this.lastTrace = {
      method: 'step',
      steps: result.collision
      ? ['Check position Y + 1', 'Detect the lower collision', 'Write the piece to board', 'Create the next piece']
        : ['Consultar la posición Y + 1', 'Mantener board intacto', 'Incrementar piece.y'],
      highlights: result.collision
        ? ['this.checkPlacement', 'this.settleCurrent()']
        : ['this.checkPlacement', 'this.piece.y++']
    };
    if (!result.collision) {
      this.piece.y++;
    } else {
      this.settleCurrent();
    }
    this.emit();
  }

  move(dx) {
    if (this.isGameOver) return;
    this.startOperation();
    const result = this.checkPlacement(this.piece.matrix, this.piece.x + dx, this.piece.y);
    this.lastDecision = { ...result, label: `Check X ${dx < 0 ? '−' : '+'} 1; change only position.x` };
    this.lastAction = 'move';
    this.lastTrace = {
      method: 'move',
      steps: result.collision
        ? ['Consultar la nueva posición X', 'Mantener position.x sin cambios']
        : ['Consultar la nueva posición X', 'Actualizar position.x sin escribir en board'],
      highlights: ['this.checkPlacement', 'this.piece.x += dx']
    };
    if (!result.collision) this.piece.x += dx;
    this.emit();
  }

  rotate() {
    if (this.isGameOver) return;
    this.startOperation();
    const rotated = rotateClockwise(this.piece.matrix);
    let accepted = false;
    for (const kick of [0, -1, 1, -2, 2]) {
      const result = this.checkPlacement(rotated, this.piece.x + kick, this.piece.y);
    this.lastDecision = { ...result, label: `Validate candidate matrix + X adjustment=${kick}` };
      if (!result.collision) {
        this.piece.matrix = rotated;
        this.piece.x += kick;
        accepted = true;
        break;
      }
    }
    this.lastAction = 'rotate';
    this.lastDecision.label = accepted ? 'piece.matrix was replaced' : 'Candidate matrix was discarded';
    this.lastTrace = {
      method: 'rotate',
      steps: accepted
      ? ['Rotate the local matrix', 'Try wall kicks on board', 'Replace piece.matrix']
      : ['Rotate the local matrix', 'Try all wall kicks', 'Discard the candidate matrix'],
      highlights: ['rotateClockwise', 'this.checkPlacement', 'this.piece.matrix = rotated']
    };
    this.emit();
  }

  hardDrop() {
    if (this.isGameOver) return;
    this.startOperation();
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
      steps: ['Check lower positions until collision', `Advance ${distance} row(s)`, 'Write the piece to board', 'Create the next piece'],
      highlights: ['this.checkPlacement', 'this.piece.y += distance', 'this.settleCurrent()']
    };
    this.settleCurrent();
    this.emit();
  }

  settleCurrent() {
    for (const { x: px, y: py } of occupiedCells(this.piece.matrix)) {
      const x = this.piece.x + px;
      const y = this.piece.y + py;
      if (y >= 0) {
        this.board[y][x] = this.piece.id;
        this.metrics.writes++;
      }
    }
    const cleared = this.clearCompletedRows();
    if (cleared > 0) {
      this.lines += cleared;
      this.score += [0, 100, 300, 500, 800][cleared] * this.level;
      this.level = Math.floor(this.lines / 10) + 1;
      this.lastAction = 'clear';
    this.lastDecision.label = `${cleared} row(s): filter and prepend empty rows`;
      this.lastTrace = {
        method: 'clearCompletedRows',
      steps: [`Detect ${cleared} completed row(s)`, 'Filter completed rows', 'Prepend empty rows', 'Update lines, score, and level'],
        highlights: ['this.board.filter', 'const cleared', 'this.board =', 'return cleared']
      };
    }
    this.spawn(true);
  }

  clearCompletedRows() {
    const remaining = this.board.filter(row => {
      for (const value of row) {
        this.metrics.reads++;
        if (value === 0) return true;
      }
      return false;
    });
    const cleared = this.rows - remaining.length;
    if (cleared === 0) return 0;
    const emptyRows = createMatrix(cleared, this.columns);
    this.board = [...emptyRows, ...remaining.map(row => [...row])];
    this.metrics.writes += this.rows * this.columns;
    return cleared;
  }

  ghostY() {
    let distance = 0;
    while (!this.checkPlacement(this.piece.matrix, this.piece.x, this.piece.y + distance + 1, false).collision) distance++;
    return this.piece.y + distance;
  }

  getVisibleMatrix() {
    const visible = cloneMatrix(this.board);
    if (this.isGameOver) return visible;
    for (const { x: px, y: py } of occupiedCells(this.piece.matrix)) {
      const x = this.piece.x + px;
      const y = this.piece.y + py;
      if (y >= 0 && y < this.rows && x >= 0 && x < this.columns) visible[y][x] = -this.piece.id;
    }
    return visible;
  }

  emit() { this.onChange?.(this); }
}
