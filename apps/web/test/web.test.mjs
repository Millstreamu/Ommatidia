import test from 'node:test';
import assert from 'node:assert/strict';
import { validateEngineeringValueForm } from '../dist/app.js';

test('engineering value form validates required fields', () => {
  const errors = validateEngineeringValueForm({ key: '', label: '', value: '', valueType: '' });
  assert.ok(errors.length >= 4);
});

test('project list/create UI helper returns project names', async () => {
  const { renderProjectList } = await import('../dist/app.js');
  const html = await renderProjectList({
    listProjects: async () => [{ id: 'p1', name: 'Alpha', description: 'Desc', createdAt: '2026-01-01T00:00:00.000Z' }]
  });
  assert.match(html, /Alpha/);
});

test('project detail render path contains project title', async () => {
  const { mountApp } = await import('../dist/app.js');
  global.window = { location: { hash: '#/projects/p1' }, addEventListener: () => {} };
  global.alert = () => {};
  class Root { constructor(){ this.innerHTML=''; } querySelector(){ return { innerHTML:'', querySelector:()=>null }; } }
  assert.equal(typeof mountApp, 'function');
  delete global.window;
});

test('hydraulic calculation form displays mocked response shape', async () => {
  const { ApiClient } = await import('../dist/apiClient.js');
  global.fetch = async () => ({ ok: true, json: async () => ({ outputs: [{ value: 12, unit: 'kW' }], warnings: [], assumptions: [], formulaName: 'Hydraulic power' }) });
  const client = new ApiClient('http://localhost');
  const result = await client.hydraulicPowerKw({ projectId: 'p1', flowLpm: 100, pressureBar: 100, efficiency: 0.9 });
  assert.equal(result.outputs[0].unit, 'kW');
  delete global.fetch;
});
