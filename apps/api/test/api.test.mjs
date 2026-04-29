import test from 'node:test';
import assert from 'node:assert/strict';
import { startApiServer } from '../dist/src/index.js';

async function withServer(fn) { const server = startApiServer(0); await new Promise((r) => server.once('listening', r)); const { port } = server.address(); const baseUrl = `http://127.0.0.1:${port}`; try { await fn(baseUrl); } finally { server.close(); } }
const projectPayload = { name: 'Project A', projectType: 'custom' };

async function createProject(base) { return (await (await fetch(`${base}/projects`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(projectPayload) })).json()); }

test('successful PDF upload', async () => { await withServer(async (base) => { const project = await createProject(base); const res = await fetch(`${base}/projects/${project.id}/documents`, { method: 'POST', body: new Uint8Array([1,2,3]), headers: { 'content-type': 'application/pdf', 'x-document-type': 'datasheet', 'x-filename': 'spec.pdf' } }); assert.equal(res.status, 201); const doc = await res.json(); assert.equal(doc.originalFilename, 'spec.pdf'); }); });

test('successful image upload', async () => { await withServer(async (base) => { const project = await createProject(base); const res = await fetch(`${base}/projects/${project.id}/documents`, { method: 'POST', body: new Uint8Array([1]), headers: { 'content-type': 'image/png', 'x-document-type': 'drawing', 'x-filename': 'a.png' } }); assert.equal(res.status, 201); }); });

test('reject unsupported file type', async () => { await withServer(async (base) => { const project = await createProject(base); const res = await fetch(`${base}/projects/${project.id}/documents`, { method: 'POST', body: new Uint8Array([1]), headers: { 'content-type': 'text/plain', 'x-document-type': 'other', 'x-filename': 'bad.txt' } }); assert.equal(res.status, 400); }); });

test('reject oversized file', async () => { await withServer(async (base) => { const project = await createProject(base); const res = await fetch(`${base}/projects/${project.id}/documents`, { method: 'POST', body: new Uint8Array(26 * 1024 * 1024), headers: { 'content-type': 'application/pdf', 'x-document-type': 'manual', 'x-filename': 'large.pdf' } }); assert.equal(res.status, 400); }); });

test('listing documents by project', async () => { await withServer(async (base) => { const project = await createProject(base); const other = await (await fetch(`${base}/projects`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'B', projectType: 'custom' }) })).json(); for (const [id, name] of [[project.id,'a.pdf'], [other.id,'b.pdf']]) { await fetch(`${base}/projects/${id}/documents`, { method: 'POST', body: new Uint8Array([7]), headers: { 'content-type': 'application/pdf', 'x-document-type': 'quote', 'x-filename': name } }); } const res = await fetch(`${base}/documents?projectId=${project.id}`); const docs = await res.json(); assert.equal(docs.length, 1); assert.equal(docs[0].projectId, project.id); }); });
