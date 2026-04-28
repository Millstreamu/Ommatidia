import test from 'node:test';
import assert from 'node:assert/strict';
import { startApiServer } from '../dist/src/index.js';

async function withServer(fn) {
  const server = startApiServer(0);
  await new Promise((r) => server.once('listening', r));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  try { await fn(baseUrl); } finally { server.close(); }
}

const projectPayload = { name: 'Project A', projectType: 'custom' };

test('creating and listing projects', async () => {
  await withServer(async (base) => {
    let response = await fetch(`${base}/projects`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(projectPayload) });
    assert.equal(response.status, 201);
    const created = await response.json();
    response = await fetch(`${base}/projects`);
    const projects = await response.json();
    assert.equal(projects.length, 1);
    assert.equal(projects[0].id, created.id);
  });
});

test('creating and listing components', async () => {
  await withServer(async (base) => {
    const project = await (await fetch(`${base}/projects`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(projectPayload) })).json();
    await fetch(`${base}/components`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ projectId: project.id, name: 'Pump', type: 'pump' }) });
    const res = await fetch(`${base}/components?projectId=${project.id}`);
    const components = await res.json();
    assert.equal(components.length, 1);
  });
});

test('creating engineering value and updating status', async () => {
  await withServer(async (base) => {
    const project = await (await fetch(`${base}/projects`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(projectPayload) })).json();
    const createRes = await fetch(`${base}/engineering-values`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ projectId: project.id, key: 'pressure', label: 'Pressure', value: 210, valueType: 'number', status: 'needs_review', sourceReferences: [] }) });
    const created = await createRes.json();
    const patchRes = await fetch(`${base}/engineering-values/${created.id}/status`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: 'approved' }) });
    const patched = await patchRes.json();
    assert.equal(patched.status, 'approved');
  });
});

test('invalid validation request returns 400', async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/projects`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ projectType: 'custom' }) });
    assert.equal(response.status, 400);
  });
});

test('missing record returns 404', async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/projects/missing`);
    assert.equal(response.status, 404);
  });
});

test('hydraulicPowerKw endpoint returns expected result', async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/calculations/hydraulic-power-kw`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ projectId: 'proj1', flowLpm: 120, pressureBar: 200, efficiency: 0.9 }) });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.outputs[0].value, 36);
  });
});
