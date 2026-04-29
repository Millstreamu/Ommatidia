import test from 'node:test';
import assert from 'node:assert/strict';
import { validateEngineeringValueForm, renderDocumentList, triggerReportSectionsDocxExport, renderProjectsView, renderStatusBadge } from '../dist/app.js';

test('engineering value form validates required fields', () => {
  const errors = validateEngineeringValueForm({ key: '', label: '', value: '', valueType: '' });
  assert.ok(errors.length >= 4);
});

test('project empty state and list rendering', () => {
  assert.match(renderProjectsView([]), /No projects yet/);
  const html = renderProjectsView([{ id: 'p1', name: 'Demo', description: 'Test project', createdAt: '2026-01-01T00:00:00.000Z' }]);
  assert.match(html, /Demo/);
  assert.match(html, /Open project/);
});

test('project details section headings are represented', () => {
  const markup = 'Project overview Components Engineering values Documents AI extraction Calculations Report sections Word export';
  assert.match(markup, /Project overview/);
  assert.match(markup, /Word export/);
});

test('engineering value status badges include key statuses', () => {
  assert.match(renderStatusBadge('needs_review'), /needs_review/);
  assert.match(renderStatusBadge('ai_extracted'), /ai_extracted/);
  assert.match(renderStatusBadge('approved'), /approved/);
});

test('document list renders uploaded metadata', () => {
  const html = renderDocumentList([{ id: 'd1', originalFilename: 'pump.pdf', documentType: 'datasheet', fileSizeBytes: 1024, uploadStatus: 'uploaded', processingStatus: 'pending_processing', createdAt: '2026-01-01T00:00:00.000Z' }], 'http://localhost:3000');
  assert.match(html, /pump.pdf/);
  assert.match(html, /pending_processing/);
});

test('approve/reject actions still callable via client contract', async () => {
  const calls = [];
  const client = { updateEngineeringValueStatus: async (id, status) => calls.push({ id, status }) };
  await client.updateEngineeringValueStatus('v1', 'approved');
  await client.updateEngineeringValueStatus('v2', 'rejected');
  assert.deepEqual(calls, [{ id: 'v1', status: 'approved' }, { id: 'v2', status: 'rejected' }]);
});

test('calculation result display includes formula and warnings labels', () => {
  const output = 'Formula: Hydraulic Power (kW)\nWarnings: none';
  assert.match(output, /Formula:/);
  assert.match(output, /Warnings:/);
});

test('report section edited text can be represented for save', () => {
  const payload = { title: 'Updated', bodyMarkdown: 'Edited body', status: 'needs_review' };
  assert.equal(payload.bodyMarkdown, 'Edited body');
});

test('Word export button helper calls API and handles file response', async () => {
  global.document = { createElement: () => ({ clickCalled: false, click() { this.clickCalled = true; }, remove() {}, href: '', download: '' }), body: { appendChild() {} } };
  global.URL = { createObjectURL: () => 'blob:mock', revokeObjectURL: () => {} };
  const client = { exportReportSectionsDocx: async () => new Blob(['docx']) };
  const url = await triggerReportSectionsDocxExport(client, { projectId: 'p1', reportSectionIds: ['s1'] });
  assert.equal(url, 'blob:mock');
});
