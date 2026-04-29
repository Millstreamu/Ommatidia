import test from 'node:test';
import assert from 'node:assert/strict';
import { engineeringValueSchema } from '@ommatidia/shared';
import { MockExtractionService } from '../dist/index.js';

test('mock extraction returns deterministic valid candidate engineering values', async () => {
  const service = new MockExtractionService();
  const result = await service.extractEngineeringValues({
    projectId: 'p1',
    documentId: 'd1',
    document: { id: 'd1', projectId: 'p1', originalFilename: 'a.pdf', storedFilename: 'a.pdf', mimeType: 'application/pdf', fileSizeBytes: 1, documentType: 'datasheet', uploadStatus: 'uploaded', processingStatus: 'uploaded', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    documentFilePath: '/tmp/a.pdf'
  });
  assert.equal(result.candidateValues[0].key, 'nominal_pressure');
  assert.equal(result.candidateValues[0].status, 'needs_review');
  assert.doesNotThrow(() => engineeringValueSchema.parse(result.candidateValues[0]));
});
