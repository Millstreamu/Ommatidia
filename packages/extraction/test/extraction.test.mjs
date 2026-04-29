import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFile, unlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { MockExtractionService, OpenAiExtractionService, RetryingExtractionService, runOpenAiSmokeTest } from '../dist/index.js';

const doc = { id:'d',projectId:'p',originalFilename:'a.pdf',storedFilename:'a.pdf',mimeType:'application/pdf',fileSizeBytes:1,documentType:'datasheet',uploadStatus:'uploaded',processingStatus:'uploaded',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString() };

const call = (svc) => withTempPdf('Default engineering PDF text', (pdfPath) => svc.extractEngineeringValues({ projectId:'p',documentId:'d',document:doc,documentFilePath:pdfPath }));
async function withTempPdf(content, fn) {
  const filePath = path.join(os.tmpdir(), `extract-${Date.now()}-${Math.random()}.pdf`);
  await writeFile(filePath, content);
  try { return await fn(filePath); } finally { await unlink(filePath).catch(() => undefined); }
}

test('mock extraction returns deterministic valid candidate engineering values', async () => { const service = new MockExtractionService(); const result = await call(service); assert.equal(result.candidateValues[0].key, 'nominal_pressure'); });
test('missing OPENAI_API_KEY returns missing_api_key', () => { const old = process.env.OPENAI_API_KEY; delete process.env.OPENAI_API_KEY; assert.throws(() => OpenAiExtractionService.fromEnv(), /OPENAI_API_KEY/); process.env.OPENAI_API_KEY = old; });

test('openai auth failure maps to invalid_api_key with safe details', async () => { const svc = new OpenAiExtractionService({ responses: { create: async () => { const e = new Error('bad key'); e.status = 401; e.type = 'invalid_request_error'; throw e; } } }, 'gpt-x'); await assert.rejects(() => call(svc), (err) => err.payload.errorCode === 'invalid_api_key' && err.payload.details.model === 'gpt-x'); });
test('openai rate limit maps to rate_limited', async () => { const svc = new OpenAiExtractionService({ responses: { create: async () => { const e = new Error('slow down'); e.status = 429; throw e; } } }); await assert.rejects(() => call(svc), /rate limit/i); });
test('openai timeout maps to request_timeout', async () => { const svc = new OpenAiExtractionService({ responses: { create: async () => { const e = new Error('timeout'); e.status = 504; throw e; } } }); await assert.rejects(() => call(svc), /timed out/i); });
test('openai invalid request/model failure maps with safe diagnostics', async () => { const svc = new OpenAiExtractionService({ responses: { create: async () => { const e = new Error('model not found'); e.status = 404; e.code = 'model_not_found'; throw e; } } }); await assert.rejects(() => call(svc), (err) => err.payload.errorCode === 'model_not_found' && err.payload.details.safeProviderMessage && err.payload.details.provider === 'openai'); });
test('unknown provider failure falls back to provider_unavailable', async () => { const svc = new OpenAiExtractionService({ responses: { create: async () => { throw new Error('weird failure'); } } }); await assert.rejects(() => call(svc), (err) => err.payload.errorCode === 'provider_unavailable'); });
test('invalid json response returns invalid_json_response', async () => { const svc = new OpenAiExtractionService({ responses: { create: async () => ({ output_text: '{bad' }) } }); await assert.rejects(() => call(svc), /invalid JSON/i); });
test('openai zero values adds visible warning', async () => { const svc = new OpenAiExtractionService({ responses: { create: async () => ({ output_text: '{"candidateValues":[],"missingInformation":[],"warnings":[]}' }) } }); const result = await call(svc); assert.match(result.warnings.join(' | '), /No engineering values were extracted/i); });
test('errors never include api key or authorization', async () => { const svc = new OpenAiExtractionService({ responses: { create: async () => { const e = new Error('Authorization: Bearer sk-test-secret'); e.status = 500; throw e; } } }); await assert.rejects(() => call(svc), (err) => !JSON.stringify(err.payload).includes('sk-test-secret') && !JSON.stringify(err.payload).toLowerCase().includes('authorization')); });
test('timeout returns request_timeout', async () => { const slow = { extractEngineeringValues: async () => { await new Promise((r) => setTimeout(r, 50)); return { candidateValues: [], missingInformation: [], warnings: [] }; } }; const svc = new RetryingExtractionService(slow, 1, 0); await assert.rejects(() => svc.extractEngineeringValues({}), /timed out/); });


test('empty output returns invalid_model_response with safe diagnostics', async () => { const svc = new OpenAiExtractionService({ responses: { create: async () => ({ id:'resp_1', status:'completed', output:[{ type:'message', content:[] }] }) } }, 'gpt-x'); await assert.rejects(() => call(svc), (err) => err.payload.errorCode === 'invalid_model_response' && err.payload.details.responseId === 'resp_1'); });
test('schema invalid output is not labelled empty output', async () => { const svc = new OpenAiExtractionService({ responses: { create: async () => ({ output_text: '{"candidateValues":123,"missingInformation":[],"warnings":[]}' }) } }); await assert.rejects(() => call(svc), (err) => err.payload.errorCode === 'schema_invalid_response'); });
test('smoke test does not expose API key on failure', async () => { const old=process.env.OPENAI_API_KEY; process.env.OPENAI_API_KEY='sk-super-secret'; const result = await runOpenAiSmokeTest(); assert.doesNotMatch(JSON.stringify(result), /sk-super-secret/); if (old===undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY=old; });


test('normalizes minimal candidate and saves inferred metadata', async () => { const svc = new OpenAiExtractionService({ responses: { create: async () => ({ output_text: '{"candidateValues":[{"label":"Rated Pressure","value":210,"unit":"bar"}],"missingInformation":[],"warnings":[]}' }) } }); const result = await call(svc); assert.equal(result.candidateValues.length, 1); assert.equal(result.candidateValues[0].valueType, 'number'); assert.equal(result.candidateValues[0].status, 'needs_review'); assert.equal(result.candidateValues[0].projectId, 'p'); assert.equal(result.candidateValues[0].documentId, 'd'); assert.deepEqual(result.candidateValues[0].sourceReferences, []); assert.equal(result.candidateValues[0].key, 'rated_pressure'); });

test('normalizes string candidate without valueType to string', async () => { const svc = new OpenAiExtractionService({ responses: { create: async () => ({ output_text: '{"candidateValues":[{"key":"model","label":"Model","value":"ABC-123"}],"missingInformation":[],"warnings":[]}' }) } }); const result = await call(svc); assert.equal(result.candidateValues[0].valueType, 'string'); });

test('invalid candidate without key label value is dropped with safe diagnostics', async () => { const svc = new OpenAiExtractionService({ responses: { create: async () => ({ output_text: '{"candidateValues":[{"valueType":"number"}],"missingInformation":[],"warnings":[]}' }) } }); const result = await call(svc); assert.equal(result.candidateValues.length, 0); assert.match(result.warnings.join(' | '), /Dropped 1 candidate: missing value field/); const dropped = result.diagnostics?.droppedCandidates ?? []; assert.equal(dropped.length, 1); assert.ok(!JSON.stringify(dropped).includes('Document server path')); });

test('normalizes legacy sourceReference object into sourceReferences array', async () => {
  await withTempPdf('Danfoss displacement 25 cc/rev pressure 260 bar', async (pdfPath) => {
    const svc = new OpenAiExtractionService({ responses: { create: async () => ({ output_text: '{"candidateValues":[{"label":"Displacement","value":25,"unit":"cc/rev","sourceReference":{"sourceText":"Displacement 25 cc/rev"}}],"missingInformation":[],"warnings":[]}' }) } });
    const result = await svc.extractEngineeringValues({ projectId: 'p', documentId: 'd', document: doc, documentFilePath: pdfPath });
    assert.equal(result.candidateValues[0].sourceReferences.length, 1);
    assert.equal(result.candidateValues[0].sourceReferences[0].documentId, 'd');
  });
});

test('normalizes sourceReferences string and drops only invalid items', async () => {
  await withTempPdf('Danfoss load sensing setting 20 bar', async (pdfPath) => {
    const svc = new OpenAiExtractionService({ responses: { create: async () => ({ output_text: '{"candidateValues":[{"label":"Load sensing setting","value":20,"unit":"bar","sourceReferences":"Load sensing setting 20 bar"},{"label":"Rotation","value":"clockwise","sourceReferences":[{"sourceText":"Rotation clockwise"},42]}],"missingInformation":[],"warnings":[]}' }) } });
    const result = await svc.extractEngineeringValues({ projectId: 'p', documentId: 'd', document: doc, documentFilePath: pdfPath });
    assert.ok(result.candidateValues.length >= 2);
    assert.match(result.candidateValues[0].sourceReferences[0].sourceText, /load sensing setting 20 bar/i);
    assert.equal(result.candidateValues[1].sourceReferences.length, 1);
  });
});

test('image-only/no-text pdf path returns useful-text warning and no model call', async () => {
  await withTempPdf('%PDF-1.4\x00\x01\x02\x03', async (pdfPath) => {
    const svc = new OpenAiExtractionService({ responses: { create: async () => { throw new Error('should not call model'); } } });
    const result = await svc.extractEngineeringValues({ projectId: 'p', documentId: 'd', document: doc, documentFilePath: pdfPath });
    assert.equal(result.candidateValues.length, 0);
    assert.match(result.warnings.join(' | '), /mostly internal PDF structure/i);
    assert.equal(result.diagnostics?.contentSentToModel, false);
  });
});

test('extraction request uses selected document content only (no stale text)', async () => {
  const seenPrompts = [];
  const svc = new OpenAiExtractionService({ responses: { create: async (payload) => {
    const textBlock = payload.input[0].content[1].text;
    seenPrompts.push(textBlock);
    return { output_text: '{"candidateValues":[],"missingInformation":[],"warnings":[]}' };
  } } });
  await withTempPdf('Danfoss displacement 25 cc/rev', async (pdfPathA) => {
    await svc.extractEngineeringValues({ projectId: 'p', documentId: 'd-a', document: { ...doc, id: 'd-a', originalFilename: 'A.pdf' }, documentFilePath: pdfPathA });
  });
  await withTempPdf('CAT 3054C max power 63 kW', async (pdfPathB) => {
    await svc.extractEngineeringValues({ projectId: 'p', documentId: 'd-b', document: { ...doc, id: 'd-b', originalFilename: 'B.pdf' }, documentFilePath: pdfPathB });
  });
  assert.match(seenPrompts[0], /Danfoss displacement 25 cc\/rev/);
  assert.doesNotMatch(seenPrompts[1], /Danfoss displacement 25 cc\/rev/);
  assert.match(seenPrompts[1], /CAT 3054C max power 63 kW/);
});


test('pdf internal text is classified suspicious and triggers fallback model call', async () => {
  await withTempPdf('/Font /Encoding 12 0 R obj endobj stream endstream xref trailer', async (pdfPath) => {
    let called = false;
    const svc = new OpenAiExtractionService({ responses: { create: async () => { called = true; return { output_text: '{"candidateValues":[],"missingInformation":[],"warnings":[]}' }; } } });
    const result = await svc.extractEngineeringValues({ projectId: 'p', documentId: 'd', document: doc, documentFilePath: pdfPath });
    assert.equal(called, true);
  });
});

test('deterministic fallback extracts danfoss-like values from visible text', async () => {
  await withTempPdf('Model code D1P25 displacement 25 cc/rev pressure compensator setting 260 bar load sensing setting 20 bar clockwise rotation', async (pdfPath) => {
    const svc = new OpenAiExtractionService({ responses: { create: async () => ({ output_text: '{"candidateValues":[],"missingInformation":[],"warnings":[]}' }) } });
    const result = await svc.extractEngineeringValues({ projectId: 'p', documentId: 'd', document: doc, documentFilePath: pdfPath });
    const keys = result.candidateValues.map((v) => v.key);
    assert.ok(keys.includes('displacement'));
    assert.ok(keys.includes('pressure_compensator_setting'));
    assert.ok(keys.includes('load_sensing_setting'));
    assert.ok(keys.includes('rotation'));
  });
});
test('suspicious pdf text triggers file/vision fallback in openai mode', async () => {
  await withTempPdf('/Page /Resources /MediaBox stream endstream', async (pdfPath) => {
    let called = false;
    const svc = new OpenAiExtractionService({ responses: { create: async () => { called = true; return { output_text: '{"candidateValues":[{"label":"Manufacturer","value":"Danfoss"}],"missingInformation":[],"warnings":[]}' }; } } });
    const result = await svc.extractEngineeringValues({ projectId: 'p', documentId: 'd', document: doc, documentFilePath: pdfPath });
    assert.equal(called, true);
    assert.equal(result.candidateValues[0].status, 'needs_review');
  });
});
test('image uploads use vision fallback path', async () => {
  const imageDoc = { ...doc, mimeType: 'image/png', originalFilename: 'pump.png' };
  const imagePath = path.join(os.tmpdir(), `extract-${Date.now()}.png`);
  await writeFile(imagePath, new Uint8Array([137,80,78,71]));
  try {
    const svc = new OpenAiExtractionService({ responses: { create: async () => ({ output_text: '{"candidateValues":[{"label":"Rotation","value":"clockwise"}],"missingInformation":[],"warnings":[]}' }) } });
    const result = await svc.extractEngineeringValues({ projectId: 'p', documentId: 'd', document: imageDoc, documentFilePath: imagePath });
    assert.equal(result.candidateValues.length, 1);
  } finally { await unlink(imagePath).catch(() => undefined); }
});
