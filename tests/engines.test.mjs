import test from 'node:test';
import assert from 'node:assert/strict';
import { LayeredMatrixEngine } from '../dist/js/engines/layered-matrix-engine.js';
import { SingleMatrixEngine } from '../dist/js/engines/single-matrix-engine.js';
import { PIECES } from '../dist/js/pieces.js';

const fixedRandom = () => 0.42;

test('both engines produce the same visible matrix', () => {
  const single = new SingleMatrixEngine(undefined, fixedRandom);
  const layered = new LayeredMatrixEngine(undefined, fixedRandom);
  const actions = [
    engine => engine.move(1),
    engine => engine.rotate(),
    engine => engine.step(),
    engine => engine.step(),
    engine => engine.move(-1),
    engine => engine.hardDrop(),
    engine => engine.rotate(),
    engine => engine.hardDrop()
  ];

  for (const action of actions) {
    action(single);
    action(layered);
    assert.deepEqual(single.getVisibleMatrix(), layered.getVisibleMatrix());
    assert.equal(single.score, layered.score);
    assert.equal(single.lines, layered.lines);
  }
});

test('moving writes the piece into the single matrix', () => {
  const engine = new SingleMatrixEngine(undefined, fixedRandom);
  engine.move(1);
  assert.ok(engine.metrics.writes > 0);
  assert.ok(engine.getVisibleMatrix().flat().some(value => value < 0));
});

test('moving with layers does not write to board', () => {
  const engine = new LayeredMatrixEngine(undefined, fixedRandom);
  engine.move(1);
  assert.equal(engine.metrics.writes, 0);
  assert.ok(engine.board.flat().every(value => value === 0));
  assert.ok(engine.getVisibleMatrix().flat().some(value => value < 0));
});

test('both engines clear a complete numeric row', () => {
  const single = new SingleMatrixEngine(undefined, fixedRandom);
  single.eraseActive();
  single.matrix[19].fill(3);
  assert.equal(single.clearCompletedRows(), 1);
  assert.deepEqual(single.matrix[0], Array(10).fill(0));

  const layered = new LayeredMatrixEngine(undefined, fixedRandom);
  layered.board[19].fill(3);
  assert.equal(layered.clearCompletedRows(), 1);
  assert.deepEqual(layered.board[0], Array(10).fill(0));
});

test('hardDrop preserves the decision it just executed', () => {
  for (const Engine of [SingleMatrixEngine, LayeredMatrixEngine]) {
    const engine = new Engine(undefined, fixedRandom);
    engine.hardDrop();
    assert.equal(engine.lastAction, 'hardDrop');
    assert.match(engine.lastDecision.label, /Hard drop/);
    assert.equal(engine.lastTrace.method, 'hardDrop');
  }
});

test('clearing a row preserves the clear trace after spawning', () => {
  const engines = [
    new SingleMatrixEngine(undefined, fixedRandom),
    new LayeredMatrixEngine(undefined, fixedRandom)
  ];

  for (const engine of engines) {
    if (engine instanceof SingleMatrixEngine) {
      engine.eraseActive();
      engine.matrix[19].fill(2);
      engine.matrix[19].fill(0, 3, 7);
    } else {
      engine.board[19].fill(2);
      engine.board[19].fill(0, 3, 7);
    }

    engine.piece = {
      name: 'I',
      id: PIECES.I.id,
      color: PIECES.I.color,
      matrix: PIECES.I.matrix.map(row => [...row]),
      x: 3,
      y: 0
    };
    engine.hardDrop();

    assert.equal(engine.lines, 1);
    assert.equal(engine.lastAction, 'clear');
    assert.match(engine.lastDecision.label, /1 row/);
    assert.equal(engine.lastTrace.method, 'clearCompletedRows');
  }
});

test('both engines show the same board after game over', () => {
  const single = new SingleMatrixEngine(undefined, fixedRandom);
  const layered = new LayeredMatrixEngine(undefined, fixedRandom);
  single.eraseActive();
  single.matrix[0].fill(7);
  single.matrix[1].fill(7);
  layered.board[0].fill(7);
  layered.board[1].fill(7);

  single.spawn();
  layered.spawn();

  assert.equal(single.isGameOver, true);
  assert.equal(layered.isGameOver, true);
  assert.deepEqual(single.getVisibleMatrix(), layered.getVisibleMatrix());
  assert.ok(layered.getVisibleMatrix().flat().every(value => value >= 0));
});

test('engines remain equivalent during long sequences', () => {
  const randomForSeed = seed => () => (
    (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296
  );
  const actions = [
    engine => engine.step(),
    engine => engine.move(-1),
    engine => engine.move(1),
    engine => engine.rotate(),
    engine => engine.hardDrop()
  ];

  for (let seed = 1; seed <= 20; seed++) {
    const single = new SingleMatrixEngine(undefined, randomForSeed(seed));
    const layered = new LayeredMatrixEngine(undefined, randomForSeed(seed));

    for (let step = 0; step < 100; step++) {
      const action = actions[(seed * 31 + step * 17) % actions.length];
      action(single);
      action(layered);
      assert.deepEqual(single.getVisibleMatrix(), layered.getVisibleMatrix());
      assert.deepEqual(
        [single.score, single.lines, single.level, single.isGameOver],
        [layered.score, layered.lines, layered.level, layered.isGameOver]
      );
      if (single.isGameOver) break;
    }
  }
});
