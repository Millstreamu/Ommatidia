import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dataStatusSchema,
  engineeringModuleSchema,
  engineeringValueSchema,
  exampleComponent,
  exampleDocument,
  exampleEngineeringModule,
  exampleEngineeringValue,
  exampleProject,
  exampleReportSection,
  sourceReferenceSchema
} from '../dist/index.js';

test('example fixtures pass shared schema validation', () => {
  assert.doesNotThrow(() => {
    // parse raises on invalid data
    sourceReferenceSchema.parse(exampleEngineeringValue.sourceReferences[0]);
    engineeringValueSchema.parse(exampleEngineeringValue);
    engineeringModuleSchema.parse(exampleEngineeringModule);
  });

  assert.equal(exampleProject.id, 'proj_hpu_001');
  assert.equal(exampleDocument.projectId, exampleProject.id);
  assert.equal(exampleComponent.projectId, exampleProject.id);
  assert.equal(exampleReportSection.projectId, exampleProject.id);
});

test('invalid DataStatus values fail schema validation', () => {
  const invalid = dataStatusSchema.safeParse('draft');
  assert.equal(invalid.success, false);
});

test('EngineeringValue requires key, label, value, status, and timestamps', () => {
  const { key, ...missingKey } = exampleEngineeringValue;
  const { label, ...missingLabel } = exampleEngineeringValue;
  const { value, ...missingValue } = exampleEngineeringValue;
  const { status, ...missingStatus } = exampleEngineeringValue;
  const { createdAt, ...missingCreatedAt } = exampleEngineeringValue;
  const { updatedAt, ...missingUpdatedAt } = exampleEngineeringValue;

  assert.equal(engineeringValueSchema.safeParse(missingKey).success, false);
  assert.equal(engineeringValueSchema.safeParse(missingLabel).success, false);
  assert.equal(engineeringValueSchema.safeParse(missingValue).success, false);
  assert.equal(engineeringValueSchema.safeParse(missingStatus).success, false);
  assert.equal(engineeringValueSchema.safeParse(missingCreatedAt).success, false);
  assert.equal(engineeringValueSchema.safeParse(missingUpdatedAt).success, false);
});

test('SourceReference supports document/page/source text references', () => {
  const parsed = sourceReferenceSchema.parse({
    documentId: 'doc_123',
    pageNumber: 5,
    sourceText: 'Nominal pressure: 210 bar'
  });

  assert.equal(parsed.documentId, 'doc_123');
  assert.equal(parsed.pageNumber, 5);
  assert.equal(parsed.sourceText, 'Nominal pressure: 210 bar');
});

test('EngineeringModule supports calculation and summary module types', () => {
  const calculation = engineeringModuleSchema.safeParse(exampleEngineeringModule);
  assert.equal(calculation.success, true);

  const summary = engineeringModuleSchema.safeParse({
    ...exampleEngineeringModule,
    id: 'mod_summary_001',
    moduleType: 'summary'
  });
  assert.equal(summary.success, true);
});
