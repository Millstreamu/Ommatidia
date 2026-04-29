import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dataStatusSchema,
  engineeringModuleSchema,
  engineeringValueSchema,
  sourceReferenceSchema
} from '../dist/index.js';

const sampleValue = {
  id: 'val_001',
  projectId: 'proj_001',
  key: 'nominal_pressure',
  label: 'Nominal Pressure',
  value: 210,
  valueType: 'number',
  unit: 'bar',
  status: 'needs_review',
  sourceReferences: [{ documentId: 'doc_001', pageNumber: 1, sourceText: 'Nominal pressure 210 bar' }],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

const sampleModule = {
  id: 'mod_001',
  name: 'Hydraulic power',
  description: 'Compute hydraulic power',
  moduleType: 'calculation',
  applicableProjectTypes: ['custom'],
  inputs: [{ key: 'flow', label: 'Flow', valueType: 'number', required: true, unit: 'L/min' }],
  outputs: [{ key: 'power', label: 'Power', valueType: 'number', required: true, unit: 'kW' }]
};

test('shared schemas validate canonical sample objects', () => {
  assert.doesNotThrow(() => {
    sourceReferenceSchema.parse(sampleValue.sourceReferences[0]);
    engineeringValueSchema.parse(sampleValue);
    engineeringModuleSchema.parse(sampleModule);
  });
});

test('invalid DataStatus values fail schema validation', () => {
  const invalid = dataStatusSchema.safeParse('draft');
  assert.equal(invalid.success, false);
});
