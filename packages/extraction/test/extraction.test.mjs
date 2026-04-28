import test from 'node:test';
import assert from 'node:assert/strict';
import { createExtractionJob } from '../dist/index.js';

test('extraction scaffold creates job payload', () => {
  assert.deepEqual(createExtractionJob('job-1', 'pdf'), { id: 'job-1', sourceType: 'pdf' });
});
