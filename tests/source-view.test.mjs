import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  buildAnnotatedSourceLines,
  extractClassMethod,
  selectExecutionLines
} from '../dist/js/source-view.js';

test('extractClassMethod returns the real method with its original lines', async () => {
  const source = await readFile('dist/js/engines/single-matrix-engine.js', 'utf8');
  const method = extractClassMethod(source, 'hardDrop');

  assert.ok(method.startLine > 0);
  assert.match(method.lines[0], /hardDrop\(\)/);
  assert.ok(method.lines.some(line => line.includes('this.settleCurrent()')));
  assert.ok(method.lines.at(-1).trim() === '}');
});

test('extractClassMethod returns null for a missing method', () => {
  assert.equal(extractClassMethod('class Example {}', 'missing'), null);
});

test('selectExecutionLines keeps only the executed path and its context', () => {
  const method = {
    startLine: 20,
    lines: [
      '  move(dx) {',
      '    this.startOperation();',
      '    const result = this.checkPlacement();',
      '    this.lastTrace = {',
      "      highlights: ['this.checkPlacement()', 'this.piece.x += dx']",
      '    };',
      '    if (!result.collision) this.piece.x += dx;',
      '  }'
    ]
  };

  const selected = selectExecutionLines(method, ['this.checkPlacement()', 'this.piece.x += dx']);
  const sourceLines = selected.filter(line => !line.omitted);

  assert.equal(sourceLines[0].lineNumber, 20);
  assert.equal(sourceLines.at(-1).lineNumber, 27);
  assert.ok(sourceLines.some(line => line.text.includes('const result = this.checkPlacement()')));
  assert.ok(sourceLines.some(line => line.text.includes('if (!result.collision) this.piece.x += dx')));
  assert.ok(!sourceLines.some(line => line.text.trimStart().startsWith('highlights:')));
  assert.ok(selected.some(line => line.omitted));
});

test('buildAnnotatedSourceLines adds comments without changing original numbers', () => {
  const source = 'const empty = 0;\nfunction move() {\n  return true;\n}';
  const lines = buildAnnotatedSourceLines(source, [
    { before: 'function move()', text: 'Validate movement before changing state.' }
  ]);

  assert.deepEqual(lines[1], {
    lineNumber: '',
    text: '// Validate movement before changing state.',
    annotation: true
  });
  assert.equal(lines[2].lineNumber, 2);
  assert.equal(lines[2].text, 'function move() {');
});
