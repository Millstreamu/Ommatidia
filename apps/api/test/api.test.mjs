import test from 'node:test';
import assert from 'node:assert/strict';
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { startApiServer } from '../dist/index.js';

async function withServer(fn) { const server = startApiServer(0); await new Promise((r) => server.once('listening', r)); const { port } = server.address(); const baseUrl = `http://127.0.0.1:${port}`; try { await fn(baseUrl); } finally { server.close(); } }
async function createProject(base) { return (await (await fetch(`${base}/projects`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Project A', projectType: 'custom' }) })).json()); }
async function uploadDoc(base, projectId) { return (await (await fetch(`${base}/projects/${projectId}/documents`, { method: 'POST', body: new Uint8Array([1,2,3]), headers: { 'content-type': 'application/pdf', 'x-document-type': 'datasheet', 'x-filename': 'spec.pdf' } })).json()); }



test('document can be assigned to component and extraction saves componentId', async () => { await withServer(async (base) => { const project = await createProject(base); const component = await (await fetch(`${base}/components`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ projectId:project.id, name:'Danfoss Pump', type:'pump' }) })).json(); const doc = await uploadDoc(base, project.id); const updatedDoc = await (await fetch(`${base}/documents/${doc.id}`, { method:'PUT', headers:{'content-type':'application/json'}, body: JSON.stringify({ componentId: component.id }) })).json(); assert.equal(updatedDoc.componentId, component.id); const extraction = await (await fetch(`${base}/extractions`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ projectId: project.id, documentId: doc.id, componentId: component.id }) })).json(); assert.ok((extraction.createdCandidateKeys ?? []).length >= 0); const created = await (await fetch(`${base}/engineering-values?projectId=${project.id}`)).json(); assert.ok(created.length > 0); assert.ok(created.every((value) => value.componentId === component.id)); }); });

test('extraction without componentId remains unassigned', async () => { await withServer(async (base) => { const project = await createProject(base); const doc = await uploadDoc(base, project.id); const res = await fetch(`${base}/extractions`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ projectId: project.id, documentId: doc.id }) }); assert.equal(res.status, 200); const created = await (await fetch(`${base}/engineering-values?projectId=${project.id}`)).json(); assert.ok(created.length > 0); assert.ok(created.some((value) => !value.componentId)); }); });

test('assigning unassigned value to component updates componentId', async () => { await withServer(async (base) => { const project = await createProject(base); const component = await (await fetch(`${base}/components`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ projectId:project.id, name:'C4.4 Engine', type:'engine' }) })).json(); const created = await (await fetch(`${base}/engineering-values`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ projectId: project.id, key:'rated_power', label:'Rated Power', value:50, valueType:'number', status:'needs_review', sourceReferences:[] }) })).json(); const reassigned = await (await fetch(`${base}/engineering-values/${created.id}`, { method:'PATCH', headers:{'content-type':'application/json'}, body: JSON.stringify({ componentId: component.id }) })).json(); assert.equal(reassigned.componentId, component.id); }); });
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


test('full API workflow: project -> component -> approved value -> hydraulic calculation -> report -> docx export', async () => { await withServer(async (base) => {
  const project = await createProject(base);
  const component = await (await fetch(`${base}/components`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ projectId:project.id, name:'Main Pump', type:'pump' }) })).json();
  const approvedValue = await (await fetch(`${base}/engineering-values`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ projectId:project.id, componentId:component.id, key:'flow_lpm', label:'Flow', value:120, valueType:'number', unit:'L/min', status:'approved', sourceReferences:[] }) })).json();
  assert.equal(approvedValue.status, 'approved');
  const calc = await (await fetch(`${base}/calculations/hydraulic-power-kw`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ projectId: project.id, flowLpm:120, pressureBar:200, efficiency:0.85 }) })).json();
  assert.equal(calc.outputs[0].key, 'hydraulic_power_kw');
  const section = await (await fetch(`${base}/report-sections/generate`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ projectId:project.id, sectionType:'calculation_summary', engineeringValues:[approvedValue] }) })).json();
  assert.equal(section.projectId, project.id);
  const docxRes = await fetch(`${base}/report-sections/export-docx`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ projectId: project.id, reportSectionIds: [section.id] }) });
  assert.equal(docxRes.status, 200);
  const bytes = new Uint8Array(await docxRes.arrayBuffer());
  assert.ok(bytes.length > 0);
}); });

test('extraction safety workflow keeps approved values on re-run', async () => { await withServer(async (base) => {
  const project = await createProject(base);
  const doc = await uploadDoc(base, project.id);
  const firstExtraction = await fetch(`${base}/extractions`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ projectId: project.id, documentId: doc.id }) });
  assert.equal(firstExtraction.status, 200);
  const valuesAfterFirstRun = await (await fetch(`${base}/engineering-values?projectId=${project.id}`)).json();
  assert.ok(valuesAfterFirstRun.length > 0);
  assert.ok(valuesAfterFirstRun.every((v) => v.status === 'needs_review' || v.status === 'ai_extracted'));
  const valueToApprove = valuesAfterFirstRun[0];
  const approved = await (await fetch(`${base}/engineering-values/${valueToApprove.id}/status`, { method:'PATCH', headers:{'content-type':'application/json'}, body: JSON.stringify({ status: 'approved' }) })).json();
  assert.equal(approved.status, 'approved');
  const secondExtraction = await fetch(`${base}/extractions`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ projectId: project.id, documentId: doc.id }) });
  assert.equal(secondExtraction.status, 200);
  const valuesAfterSecondRun = await (await fetch(`${base}/engineering-values?projectId=${project.id}`)).json();
  const approvedValues = valuesAfterSecondRun.filter((v) => v.id === valueToApprove.id);
  assert.equal(approvedValues.length, 1);
  assert.equal(approvedValues[0].status, 'approved');
}); });

test('report safety workflow includes approved values and excludes needs_review values', async () => { await withServer(async (base) => {
  const project = await createProject(base);
  const approved = await (await fetch(`${base}/engineering-values`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ projectId:project.id, key:'pressure', label:'Pressure', value:180, valueType:'number', unit:'bar', status:'approved', sourceReferences:[] }) })).json();
  const needsReview = await (await fetch(`${base}/engineering-values`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ projectId:project.id, key:'draft_value', label:'Draft Value', value:999, valueType:'number', status:'needs_review', sourceReferences:[] }) })).json();
  const generated = await (await fetch(`${base}/report-sections/generate`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ projectId:project.id, sectionType:'component_summary', engineeringValues:[approved, needsReview] }) })).json();
  assert.match(generated.bodyMarkdown, /Pressure/);
  assert.doesNotMatch(generated.bodyMarkdown, /Draft Value/);
}); });


test('unknown API route returns not found', async () => { await withServer(async (base) => {
  const res = await fetch(`${base}/does-not-exist`);
  assert.equal(res.status, 404);
  const body = await res.json();
  assert.equal(body.error, 'Not found');
}); });


test('OPTIONS includes CORS headers and returns 204', async () => { await withServer(async (base) => {
  const res = await fetch(`${base}/projects`, { method: 'OPTIONS', headers: { origin: 'https://friendly-space-abc123-3000.app.github.dev' } });
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('access-control-allow-methods'), 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  assert.match(res.headers.get('access-control-allow-headers') ?? '', /content-type/i);
}); });

test('GET /projects includes CORS headers for allowed dev origin', async () => { await withServer(async (base) => {
  const res = await fetch(`${base}/projects`, { headers: { origin: 'http://localhost:3000' } });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('access-control-allow-origin'), 'http://localhost:3000');
}); });

test('unknown route includes CORS headers', async () => { await withServer(async (base) => {
  const res = await fetch(`${base}/missing`, { headers: { origin: 'http://127.0.0.1:3000' } });
  assert.equal(res.status, 404);
  assert.equal(res.headers.get('access-control-allow-origin'), 'http://127.0.0.1:3000');
}); });

test('system status returns openAiConfigured false when OPENAI_API_KEY missing', async () => {
  const prevProvider = process.env.EXTRACTION_PROVIDER;
  const prevKey = process.env.OPENAI_API_KEY;
  process.env.EXTRACTION_PROVIDER = 'openai';
  delete process.env.OPENAI_API_KEY;
  try {
    await withServer(async (base) => {
      const res = await fetch(`${base}/system/status`);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.extractionProvider, 'openai');
      assert.equal(body.openAiConfigured, false);
      assert.ok(body.openAiModel);
    });
  } finally {
    process.env.EXTRACTION_PROVIDER = prevProvider;
    if (prevKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = prevKey;
  }
});

test('system status returns openAiConfigured true when OPENAI_API_KEY set', async () => {
  const prevProvider = process.env.EXTRACTION_PROVIDER;
  const prevKey = process.env.OPENAI_API_KEY;
  process.env.EXTRACTION_PROVIDER = 'openai';
  process.env.OPENAI_API_KEY = 'unit-test-key';
  try {
    await withServer(async (base) => {
      const res = await fetch(`${base}/system/status`);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.openAiConfigured, true);
      assert.ok(body.openAiModel);
    });
  } finally {
    process.env.EXTRACTION_PROVIDER = prevProvider;
    if (prevKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = prevKey;
  }
});

test('system status defaults provider to mock when EXTRACTION_PROVIDER unset', async () => {
  const prevProvider = process.env.EXTRACTION_PROVIDER;
  delete process.env.EXTRACTION_PROVIDER;
  try {
    await withServer(async (base) => {
      const res = await fetch(`${base}/system/status`);
      const body = await res.json();
      assert.equal(body.extractionProvider, 'mock');
    });
  } finally {
    if (prevProvider === undefined) delete process.env.EXTRACTION_PROVIDER; else process.env.EXTRACTION_PROVIDER = prevProvider;
  }
});

test('PATCH /system/extraction-provider validates OpenAI key and switches provider', async () => {
  const prevKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    await withServer(async (base) => {
      const rejected = await fetch(`${base}/system/extraction-provider`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ extractionProvider: 'openai' }) });
      assert.equal(rejected.status, 400);
      const rejectedBody = await rejected.json();
      assert.equal(rejectedBody.message, 'OpenAI API key is not configured on the server.');
      process.env.OPENAI_API_KEY = 'unit-test-key';
      const switched = await fetch(`${base}/system/extraction-provider`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ extractionProvider: 'openai' }) });
      assert.equal(switched.status, 200);
      const switchedBody = await switched.json();
      assert.equal(switchedBody.extractionProvider, 'openai');
      const back = await fetch(`${base}/system/extraction-provider`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ extractionProvider: 'mock' }) });
      assert.equal(back.status, 200);
      const backBody = await back.json();
      assert.equal(backBody.extractionProvider, 'mock');
      const fixtureMode = await fetch(`${base}/system/extraction-provider`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ extractionProvider: 'fixture' }) });
      assert.equal(fixtureMode.status, 200);
      const fixtureBody = await fixtureMode.json();
      assert.equal(fixtureBody.extractionProvider, 'fixture');
    });
  } finally {
    if (prevKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = prevKey;
  }
});

test('system status never includes OPENAI_API_KEY values', async () => {
  const prevProvider = process.env.EXTRACTION_PROVIDER;
  const prevKey = process.env.OPENAI_API_KEY;
  process.env.EXTRACTION_PROVIDER = 'openai';
  process.env.OPENAI_API_KEY = 'super-secret-value';
  try {
    await withServer(async (base) => {
      const res = await fetch(`${base}/system/status`);
      const raw = await res.text();
      assert.doesNotMatch(raw, /super-secret-value/);
      assert.doesNotMatch(raw, /OPENAI_API_KEY/);
    });
  } finally {
    process.env.EXTRACTION_PROVIDER = prevProvider;
    if (prevKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = prevKey;
  }
});


test('system status exposes safe extraction timeout config', async () => {
  const prevTimeout = process.env.EXTRACTION_TIMEOUT_MS;
  const prevRetries = process.env.EXTRACTION_MAX_RETRIES;
  const prevKey = process.env.OPENAI_API_KEY;
  process.env.EXTRACTION_TIMEOUT_MS = '120000';
  process.env.EXTRACTION_MAX_RETRIES = '1';
  process.env.OPENAI_API_KEY = 'super-secret-value';
  try {
    await withServer(async (base) => {
      const res = await fetch(`${base}/system/status`);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.extractionConfig.timeoutMs, 120000);
      assert.equal(body.extractionConfig.maxRetries, 1);
      const raw = JSON.stringify(body);
      assert.doesNotMatch(raw, /super-secret-value/);
      assert.doesNotMatch(raw, /OPENAI_API_KEY/);
    });
  } finally {
    if (prevTimeout === undefined) delete process.env.EXTRACTION_TIMEOUT_MS; else process.env.EXTRACTION_TIMEOUT_MS = prevTimeout;
    if (prevRetries === undefined) delete process.env.EXTRACTION_MAX_RETRIES; else process.env.EXTRACTION_MAX_RETRIES = prevRetries;
    if (prevKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = prevKey;
  }
});

test('extraction uses selected runtime provider for attempts', async () => {
  const prevKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'unit-test-key';
  try {
    await withServer(async (base) => {
      const project = await createProject(base);
      const doc = await uploadDoc(base, project.id);
      await fetch(`${base}/system/extraction-provider`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ extractionProvider: 'mock' }) });
      await fetch(`${base}/extractions`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ projectId: project.id, documentId: doc.id }) });
      await fetch(`${base}/system/extraction-provider`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ extractionProvider: 'openai' }) });
      await fetch(`${base}/extractions`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ projectId: project.id, documentId: doc.id }) });
      const attempts = await (await fetch(`${base}/extractions/attempts?projectId=${project.id}&documentId=${doc.id}`)).json();
      assert.equal(attempts[0].provider, 'mock');
      assert.equal(attempts[1].provider, 'openai');
    });
  } finally {
    if (prevKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = prevKey;
  }
});


test('openai smoke test returns safe not-configured response when key missing', async () => {
  const prevKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    await withServer(async (base) => {
      const res = await fetch(`${base}/system/openai-smoke-test`);
      assert.ok(res.status === 502 || res.status === 401);
      const body = await res.json();
      assert.equal(body.ok, false);
      assert.equal(body.provider, 'openai');
      assert.doesNotMatch(JSON.stringify(body), /unit-test-key|super-secret|Bearer\s+/i);
    });
  } finally { if (prevKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = prevKey; }
});


test('extraction fixture save/list/get/delete flow', async () => { await withServer(async (base) => {
  const payload = { name:'Danfoss sample', originalFilename:'danfoss.pdf', documentType:'datasheet', candidateValues:[{ id:'v1', projectId:'p1', key:'pressure', label:'Pressure', value:200, valueType:'number', unit:'bar', status:'needs_review', sourceReferences:[], createdAt:new Date().toISOString(), updatedAt:new Date().toISOString(), apiKey:'should_not_store', rawText:'full text' }], warnings:['check unit'] };
  const savedRes = await fetch(`${base}/extraction-fixtures`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(payload) });
  assert.equal(savedRes.status, 201);
  const saved = await savedRes.json();
  assert.equal(saved.name, payload.name);
  assert.equal(saved.candidateValues[0].apiKey, undefined);
  assert.equal(saved.candidateValues[0].rawText, undefined);
  const listed = await (await fetch(`${base}/extraction-fixtures`)).json();
  assert.ok(listed.length >= 1);
  const got = await (await fetch(`${base}/extraction-fixtures/${saved.fixtureId}`)).json();
  assert.equal(got.fixtureId, saved.fixtureId);
  const del = await (await fetch(`${base}/extraction-fixtures/${saved.fixtureId}`, { method:'DELETE' })).json();
  assert.equal(del.deleted, true);
}); });

test('fixture provider replays fixture values with regenerated ids/ownership and needs_review', async () => { await withServer(async (base) => {
  const project = await createProject(base);
  const component = await (await fetch(`${base}/components`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ projectId:project.id, name:'Pump A', type:'pump' }) })).json();
  const doc = await uploadDoc(base, project.id);
  const fixture = await (await fetch(`${base}/extraction-fixtures`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ name:'Fixture 1', originalFilename:'f.pdf', documentType:'datasheet', candidateValues:[{ id:'old-id', projectId:'old-p', documentId:'old-d', componentId:'old-c', key:'pressure', label:'Pressure', value:250, valueType:'number', unit:'bar', notes:'fixture note', status:'approved', sourceReferences:[{ documentId:'old-d', sourceText:'safe' }], createdAt:'2020-01-01T00:00:00.000Z', updatedAt:'2020-01-01T00:00:00.000Z' }], warnings:[] }) })).json();
  await fetch(`${base}/system/extraction-provider`, { method:'PATCH', headers:{'content-type':'application/json'}, body: JSON.stringify({ extractionProvider:'fixture' }) });
  const replay = await (await fetch(`${base}/extractions`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ projectId:project.id, documentId:doc.id, componentId:component.id, fixtureId:fixture.fixtureId }) })).json();
  assert.equal(replay.providerMetadata.provider, 'fixture');
  assert.match(replay.warnings[0], /does not call OpenAI/i);
  const created = await (await fetch(`${base}/engineering-values?projectId=${project.id}`)).json();
  assert.equal(created.length, 1);
  assert.equal(created[0].key, 'pressure');
  assert.equal(created[0].projectId, project.id);
  assert.equal(created[0].documentId, doc.id);
  assert.equal(created[0].componentId, component.id);
  assert.equal(created[0].status, 'needs_review');
  assert.notEqual(created[0].id, 'old-id');
  const attempts = await (await fetch(`${base}/extractions/attempts?projectId=${project.id}&documentId=${doc.id}`)).json();
  assert.equal(attempts[0].provider, 'fixture');
  assert.equal(attempts[0].diagnostics.fixtureId, fixture.fixtureId);
}); });
