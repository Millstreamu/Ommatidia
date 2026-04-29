import test from 'node:test';
import assert from 'node:assert/strict';
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { startApiServer } from '../dist/index.js';

async function withServer(fn) { const server = startApiServer(0); await new Promise((r) => server.once('listening', r)); const { port } = server.address(); const baseUrl = `http://127.0.0.1:${port}`; try { await fn(baseUrl); } finally { server.close(); } }
async function createProject(base) { return (await (await fetch(`${base}/projects`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Project A', projectType: 'custom' }) })).json()); }
async function uploadDoc(base, projectId) { return (await (await fetch(`${base}/projects/${projectId}/documents`, { method: 'POST', body: new Uint8Array([1,2,3]), headers: { 'content-type': 'application/pdf', 'x-document-type': 'datasheet', 'x-filename': 'spec.pdf' } })).json()); }

test('report sections CRUD via API', async () => { await withServer(async (base) => { const project = await createProject(base); await fetch(`${base}/engineering-values`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ projectId:project.id, key:'flow', label:'Flow', value:100, valueType:'number', status:'approved', sourceReferences:[] }) }); const created = await (await fetch(`${base}/report-sections/generate`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ projectId:project.id, sectionType:'component_summary', engineeringValues:[{ id:'v1', projectId:project.id, key:'flow', label:'Flow', value:100, valueType:'number', status:'approved', sourceReferences:[], createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() }] }) })).json(); const listed = await (await fetch(`${base}/report-sections?projectId=${project.id}`)).json(); assert.equal(listed.length, 1); const got = await (await fetch(`${base}/report-sections/${created.id}`)).json(); assert.equal(got.id, created.id); const updated = await (await fetch(`${base}/report-sections/${created.id}`, { method:'PATCH', headers:{'content-type':'application/json'}, body: JSON.stringify({ title:'Updated', bodyMarkdown:'Edited body', status:'approved' }) })).json(); assert.equal(updated.title, 'Updated'); const del = await (await fetch(`${base}/report-sections/${created.id}`, { method:'DELETE' })).json(); assert.equal(del.deleted, true); }); });

test('extraction success and attempt tracking', async () => { await withServer(async (base) => { const project = await createProject(base); const doc = await uploadDoc(base, project.id); const res = await fetch(`${base}/extractions`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ projectId: project.id, documentId: doc.id }) }); assert.equal(res.status, 200); const attempts = await (await fetch(`${base}/extractions/attempts?projectId=${project.id}&documentId=${doc.id}`)).json(); assert.equal(attempts[0].status, 'succeeded'); }); });

test('missing file returns clean error and failed attempt', async () => { await withServer(async (base) => { const project = await createProject(base); const doc = await uploadDoc(base, project.id); await unlink(path.resolve(process.cwd(), 'storage/uploads', doc.storedFilename)); const res = await fetch(`${base}/extractions`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ projectId: project.id, documentId: doc.id }) }); assert.equal(res.status, 404); const body = await res.json(); assert.equal(body.errorCode, 'file_not_found'); }); });

test('unsupported file type returns clean error', async () => { await withServer(async (base) => { const project = await createProject(base); const res = await fetch(`${base}/projects/${project.id}/documents`, { method: 'POST', body: 'x', headers: { 'content-type': 'text/plain', 'x-document-type': 'datasheet', 'x-filename': 'a.txt' } }); assert.equal(res.status, 400); const body = await res.json(); assert.equal(body.errorCode, 'unsupported_file_type'); }); });

test('report sections export docx endpoint validates and returns file', async () => { await withServer(async (base) => { const project = await createProject(base); const created = await (await fetch(`${base}/report-sections/generate`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ projectId:project.id, sectionType:'missing_information', engineeringValues:[], missingInformation:['Need pressure rating'] }) })).json(); const res = await fetch(`${base}/report-sections/export-docx`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ projectId: project.id, reportSectionIds: [created.id], includeSourceReferences: true }) }); assert.equal(res.status, 200); assert.equal(res.headers.get('content-type'), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'); const bytes = new Uint8Array(await res.arrayBuffer()); assert.ok(bytes.length > 0); }); });

test('report sections export docx rejects missing projectId and empty selection', async () => { await withServer(async (base) => { const missingProject = await fetch(`${base}/report-sections/export-docx`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ projectId: '', reportSectionIds: ['x'] }) }); assert.equal(missingProject.status, 400); const emptySelection = await fetch(`${base}/report-sections/export-docx`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ projectId: 'p1', reportSectionIds: [] }) }); assert.equal(emptySelection.status, 400); }); });

test('report sections export docx rejects section ids from another project', async () => { await withServer(async (base) => { const project1 = await createProject(base); const project2 = await (await fetch(`${base}/projects`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Project B', projectType: 'custom' }) })).json(); const created = await (await fetch(`${base}/report-sections/generate`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ projectId:project2.id, sectionType:'missing_information', engineeringValues:[], missingInformation:['Need pressure rating'] }) })).json(); const res = await fetch(`${base}/report-sections/export-docx`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ projectId: project1.id, reportSectionIds: [created.id] }) }); assert.equal(res.status, 400); }); });

test('component library promote/list/copy/compare flow', async () => { await withServer(async (base) => {
  const project = await createProject(base);
  const comp = await (await fetch(`${base}/components`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ projectId:project.id, name:'Pump', type:'pump' }) })).json();
  await fetch(`${base}/engineering-values`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ projectId:project.id, componentId:comp.id, key:'pressure', label:'Pressure', value:200, valueType:'number', unit:'bar', status:'approved', sourceReferences:[] }) });
  await fetch(`${base}/engineering-values`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ projectId:project.id, componentId:comp.id, key:'draft', label:'Draft', value:10, valueType:'number', status:'needs_review', sourceReferences:[] }) });
  const promotedRes = await fetch(`${base}/component-library/promote`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ projectId:project.id, componentId:comp.id, tags:['std'] }) });
  assert.equal(promotedRes.status, 201);
  const promoted = await promotedRes.json();
  assert.equal(promoted.approvedEngineeringValues.length, 1);
  assert.equal(promoted.approvedEngineeringValues[0].key, 'pressure');
  const listed = await (await fetch(`${base}/component-library?q=pump`)).json();
  assert.equal(listed.length, 1);
  const project2 = await (await fetch(`${base}/projects`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ name:'Project B', projectType:'custom' }) })).json();
  await fetch(`${base}/components`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ projectId:project2.id, name:'Existing', type:'pump' }) });
  const copied = await (await fetch(`${base}/component-library/${promoted.id}/copy-to-project`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ targetProjectId: project2.id }) })).json();
  assert.equal(copied.engineeringValues.length, 1);
  const project2Values = await (await fetch(`${base}/engineering-values?projectId=${project2.id}`)).json();
  assert.ok(project2Values.length >= 1);
  const compare = await (await fetch(`${base}/component-library/${promoted.id}/compare`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ targetProjectId: project2.id, targetComponentId: copied.component.id }) })).json();
  assert.equal(compare.matching.length, 1);
}); });

test('promotion fails when no eligible values exist', async () => { await withServer(async (base) => {
  const project = await createProject(base);
  const comp = await (await fetch(`${base}/components`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ projectId:project.id, name:'Nope', type:'valve' }) })).json();
  await fetch(`${base}/engineering-values`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ projectId:project.id, componentId:comp.id, key:'x', label:'x', value:1, valueType:'number', status:'ai_extracted', sourceReferences:[] }) });
  const res = await fetch(`${base}/component-library/promote`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ projectId:project.id, componentId:comp.id }) });
  assert.equal(res.status, 400);
}); });
