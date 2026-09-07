export const ENGINE_TYPES = Object.freeze({
  SINGLE_MATRIX: 'single-matrix',
  LAYERED_MATRIX: 'layered-matrix'
});

export const ENGINE_METADATA = Object.freeze({
  [ENGINE_TYPES.SINGLE_MATRIX]: {
    className: 'SingleMatrixEngine',
    fileName: 'single-matrix-engine.js',
    title: 'Single matrix',
    memory: 'matrix[20][10] stores fixed blocks and the active piece',
    activeEncoding: '−1…−7 = active piece · 1…7 = fixed blocks'
  },
  [ENGINE_TYPES.LAYERED_MATRIX]: {
    className: 'LayeredMatrixEngine',
    fileName: 'layered-matrix-engine.js',
    title: 'Separate layers',
    memory: 'board[20][10] + piece[h][w] + position{x,y}',
    activeEncoding: 'The active piece is not written to board until it locks'
  }
});

export function assertEngineContract(engine) {
  const methods = ['step', 'move', 'rotate', 'hardDrop', 'reset', 'ghostY', 'getVisibleMatrix'];
  for (const method of methods) {
    if (typeof engine[method] !== 'function') {
    throw new TypeError(`The engine must implement ${method}()`);
    }
  }
  return engine;
}
