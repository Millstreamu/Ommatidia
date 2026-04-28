import test from 'node:test';
import assert from 'node:assert/strict';
import { createReportRequest } from '../dist/index.js';

test('reports scaffold creates report request metadata', () => {
  assert.deepEqual(createReportRequest('rep-1', 'markdown'), { id: 'rep-1', format: 'markdown' });
});
