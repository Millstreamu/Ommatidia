import test from 'node:test';
import assert from 'node:assert/strict';
import { projectName } from '../dist/index.js';

test('shared scaffold exposes project name', () => {
  assert.equal(projectName, 'Engineering Design Assistant');
});
