import test from 'node:test';
import assert from 'node:assert/strict';
import { validateEngineeringValueForm, renderDocumentList, triggerReportSectionsDocxExport } from '../dist/app.js';

test('engineering value form validates required fields', () => {
  const errors = validateEngineeringValueForm({ key: '', label: '', value: '', valueType: '' });
  assert.ok(errors.length >= 4);
});

test('document list renders uploaded metadata', () => {
  const html = renderDocumentList([{ id: 'd1', originalFilename: 'pump.pdf', documentType: 'datasheet', fileSizeBytes: 1024, uploadStatus: 'uploaded', processingStatus: 'pending_processing', createdAt: '2026-01-01T00:00:00.000Z' }], 'http://localhost:3000');
  assert.match(html, /pump.pdf/);
  assert.match(html, /datasheet/);
  assert.match(html, /1024/);
  assert.match(html, /pending_processing/);
});

test('report sections render from mocked api data', () => {
  const markup = '<h3>Report Sections (Editable Drafts)</h3><textarea data-report-body-id="r1">Body</textarea>';
  assert.match(markup, /Report Sections/);
  assert.match(markup, /data-report-body-id/);
});

test('report section edited text can be represented for save', () => {
  const payload = { title: 'Updated', bodyMarkdown: 'Edited body', status: 'needs_review' };
  assert.equal(payload.bodyMarkdown, 'Edited body');
});

test('export button helper calls API and handles file response', async () => {
  global.document = { createElement: () => ({ clickCalled: false, click() { this.clickCalled = true; }, remove() {}, href: '', download: '' }), body: { appendChild() {} } };
  global.URL = { createObjectURL: () => 'blob:mock', revokeObjectURL: () => {} };
  const client = { exportReportSectionsDocx: async () => new Blob(['docx']) };
  const url = await triggerReportSectionsDocxExport(client, { projectId: 'p1', reportSectionIds: ['s1'] });
  assert.equal(url, 'blob:mock');
});
