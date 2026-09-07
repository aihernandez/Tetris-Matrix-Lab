import { ENGINE_TYPES, assertEngineContract } from './engine-contract.js';
import { LayeredMatrixEngine } from './layered-matrix-engine.js';
import { SingleMatrixEngine } from './single-matrix-engine.js';

export function createEngine(type, onChange, random = Math.random) {
  const engine = type === ENGINE_TYPES.SINGLE_MATRIX
    ? new SingleMatrixEngine(onChange, random)
    : new LayeredMatrixEngine(onChange, random);

  return assertEngineContract(engine);
}
