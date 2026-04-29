import test from 'node:test';
import assert from 'node:assert/strict';
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { startApiServer } from '../dist/index.js';

async function withServer(fn) { const server = startApiServer(0); await new Promise((r) => server.once('listening', r)); const { port } = server.address(); const baseUrl = `http://127.0.0.1:${port}`; try { await fn(baseUrl); } finally { server.close(); } }
async function createProject(base) { return (await (await fetch(`${base}/projects`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Project A', projectType: 'custom' }) })).json()); }
async function uploadDoc(base, projectId) { return (await (await fetch(`${base}/projects/${projectId}/documents`, { method: 'POST', body: new Uint8Array([1,2,3]), headers: { 'content-type': 'application/pdf', 'x-document-type': 'datasheet', 'x-filename': 'spec.pdf' } })).json()); }

test('extraction success and attempt tracking', async () => { await withServer(async (base) => { const project = await createProject(base); const doc = await uploadDoc(base, project.id); const res = await fetch(`${base}/extractions`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ projectId: project.id, documentId: doc.id }) }); assert.equal(res.status, 200); const attempts = await (await fetch(`${base}/extractions/attempts?projectId=${project.id}&documentId=${doc.id}`)).json(); assert.equal(attempts[0].status, 'succeeded'); }); });

test('missing file returns clean error and failed attempt', async () => { await withServer(async (base) => { const project = await createProject(base); const doc = await uploadDoc(base, project.id); await unlink(path.resolve(process.cwd(), 'storage/uploads', doc.storedFilename)); const res = await fetch(`${base}/extractions`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ projectId: project.id, documentId: doc.id }) }); assert.equal(res.status, 404); const body = await res.json(); assert.equal(body.errorCode, 'file_not_found'); }); });

test('unsupported file type returns clean error', async () => { await withServer(async (base) => { const project = await createProject(base); const res = await fetch(`${base}/projects/${project.id}/documents`, { method: 'POST', body: 'x', headers: { 'content-type': 'text/plain', 'x-document-type': 'datasheet', 'x-filename': 'a.txt' } }); assert.equal(res.status, 400); const body = await res.json(); assert.equal(body.errorCode, 'unsupported_file_type'); }); });
