import test from 'node:test';
import assert from 'node:assert/strict';
import { PieceBag } from '../dist/js/pieces.js';

test('PieceBag returns all seven pieces once before repeating', () => {
  const bag = new PieceBag(() => 0.42);
  const names = Array.from({ length: 7 }, () => bag.next().name);
  assert.equal(new Set(names).size, 7);
});

test('PieceBag returns matrices that do not share references', () => {
  const firstBag = new PieceBag(() => 0.42);
  const first = firstBag.next();
  const secondBag = new PieceBag(() => 0.42);
  const second = secondBag.next();
  first.matrix[0][0] = 99;
  assert.notEqual(second.matrix[0][0], 99);
});
