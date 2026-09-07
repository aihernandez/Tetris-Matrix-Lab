import test from 'node:test';
import assert from 'node:assert/strict';
import { cloneMatrix, createMatrix, rotateClockwise } from '../dist/js/matrix.js';

test('createMatrix creates independent rows and uses 0 for empty cells', () => {
  const board = createMatrix(2, 3);
  board[0][0] = 7;
  assert.equal(board[1][0], 0);
});

test('cloneMatrix does not share the original rows', () => {
  const original = [[1, 2], [3, 4]];
  const copy = cloneMatrix(original);
  copy[0][0] = 9;
  assert.equal(original[0][0], 1);
});

test('rotateClockwise rotates a rectangular matrix by 90 degrees', () => {
  assert.deepEqual(
    rotateClockwise([[1, 0, 0], [1, 1, 1]]),
    [[1, 1], [1, 0], [1, 0]]
  );
});
