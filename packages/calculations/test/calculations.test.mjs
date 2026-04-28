import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateSafetyFactor } from '../dist/index.js';

test('calculations scaffold computes ratio', () => {
  const result = estimateSafetyFactor(50, 100);
  assert.equal(result.output, 0.5);
  assert.equal(result.units, 'ratio');
});
