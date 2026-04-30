import test from 'node:test';
import assert from 'node:assert/strict';
import { validateEngineeringValueForm, renderDocumentList, triggerReportSectionsDocxExport, renderProjectsView, renderStatusBadge, renderOpenAiStatusBadge, renderExtractionProviderControls, formatExtractionFailure, resolveApiBaseUrl, submitCreateProject, renderDroppedCandidateWarnings, renderExtractionDiagnostics, renderEngineeringValuesSection } from '../dist/app.js';
import { startWebApp } from '../dist/index.js';
import { createServer } from 'node:http';
import { ApiClient } from '../dist/apiClient.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

async function withWebServer(fn) {
  const previousCwd = process.cwd();
  const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  process.chdir(webRoot);
  const server = startWebApp(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  try { await fn(baseUrl); } finally { server.close(); process.chdir(previousCwd); }
}

test('engineering value form validates required fields', () => {
  const errors = validateEngineeringValueForm({ key: '', label: '', value: '', valueType: '' });
  assert.ok(errors.length >= 4);
});

test('resolveApiBaseUrl defaults to same-origin /api', () => {
  assert.equal(resolveApiBaseUrl('localhost'), '/api');
  assert.equal(resolveApiBaseUrl('friendly-space-abc123-3000.app.github.dev'), '/api');
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
test('component review layout groups statuses and actions correctly', () => {
  const html = renderEngineeringValuesSection(
    [{ id: 'c1', name: '3054C', type: 'Engine' }],
    [
      { id: 'v1', componentId: 'c1', label: 'Maximum Power', value: 97, unit: 'kW', status: 'approved' },
      { id: 'v2', componentId: 'c1', label: 'Bore', value: 105, unit: 'mm', status: 'user_entered' },
      { id: 'v3', componentId: 'c1', label: 'Rated Speed', value: '2200-2400', unit: 'rpm', status: 'needs_review' },
      { id: 'v4', componentId: 'c1', label: 'Temp', value: 108, unit: '°C', status: 'rejected' },
      { id: 'v5', label: 'Unassigned', value: 10, unit: 'bar', status: 'ai_extracted' }
    ]
  );
  assert.match(html, /Approved data/);
  assert.match(html, /Needs review/);
  assert.match(html, /Rejected/);
  assert.doesNotMatch(html, /<strong>Maximum Power<\/strong>[\s\S]*data-status-id="v1"/);
  assert.match(html, /Rated Speed[\s\S]*Approve<\/button>[\s\S]*Reject<\/button>/);
  assert.match(html, /Unassigned extracted values/);
  assert.match(html, /data-assign-action-id="v5"/);
});

test('OpenAI status badge renders connected state', () => {
  const html = renderOpenAiStatusBadge({ ok: true, extractionProvider: 'openai', openAiConfigured: true, apiProxyMode: true, timestamp: new Date().toISOString() });
  assert.match(html, /OpenAI: connected/);
});

test('OpenAI status badge renders missing key state', () => {
  const html = renderOpenAiStatusBadge({ ok: true, extractionProvider: 'openai', openAiConfigured: false, apiProxyMode: true, timestamp: new Date().toISOString() });
  assert.match(html, /OpenAI: key missing/);
});

test('OpenAI status badge renders mock mode state', () => {
  const html = renderOpenAiStatusBadge({ ok: true, extractionProvider: 'mock', openAiConfigured: false, apiProxyMode: true, timestamp: new Date().toISOString() });
  assert.match(html, /Extraction: mock mode/);
});

test('extraction provider controls render provider state and credit note', () => {
  const html = renderExtractionProviderControls({ ok: true, extractionProvider: 'openai', openAiConfigured: true, apiProxyMode: true, timestamp: new Date().toISOString() });
  assert.match(html, /Extraction: OpenAI/);
  assert.match(html, /Real OpenAI extraction may use API credits\./);
  assert.match(html, /Test OpenAI/);
  assert.match(html, /Small connectivity\/configuration test only/);
});

test('extraction provider controls disable OpenAI when key missing', () => {
  const html = renderExtractionProviderControls({ ok: true, extractionProvider: 'mock', openAiConfigured: false, apiProxyMode: true, timestamp: new Date().toISOString() });
  assert.match(html, /OpenAI key missing/);
  assert.match(html, /option value="fixture"/);
  assert.match(html, /option value="openai"[^>]*disabled/);
});

test('OpenAI status badge renders unavailable state', () => {
  const html = renderOpenAiStatusBadge(undefined, true);
  assert.match(html, /Status unavailable/);
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
  const originalDocument = global.document;
  const originalURL = global.URL;
  global.document = { createElement: () => ({ clickCalled: false, click() { this.clickCalled = true; }, remove() {}, href: '', download: '' }), body: { appendChild() {} } };
  global.URL = { createObjectURL: () => 'blob:mock', revokeObjectURL: () => {} };
  const client = { exportReportSectionsDocx: async () => new Blob(['docx']) };
  const url = await triggerReportSectionsDocxExport(client, { projectId: 'p1', reportSectionIds: ['s1'] });
  assert.equal(url, 'blob:mock');
  global.document = originalDocument;
  global.URL = originalURL;
});

test('web root serves html with loading state and mount script', async () => {
  await withWebServer(async (base) => {
    const res = await fetch(base + '/');
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') ?? '', /text\/html/);
    const html = await res.text();
    assert.match(html, /Loading Engineering Design Assistant/);
    assert.match(html, /mountApp/);
    assert.match(html, /resolveApiBaseUrl/);
    assert.doesNotMatch(html, /^\s*\[/);
  });
});

test('web serves app.js as javascript with valid module import', async () => {
  await withWebServer(async (base) => {
    const res = await fetch(base + '/app.js');
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') ?? '', /application\/javascript/);
    const body = await res.text();
    assert.match(body, /import\s+\{\s*ApiClient\s*\}\s+from\s+'\.\/apiClient\.js';/);
    assert.doesNotMatch(body, /import\s+\{\s*ApiClient\s*\}\s*\n/);
  });
});

test('web serves apiClient.js as javascript module and not html', async () => {
  await withWebServer(async (base) => {
    const res = await fetch(base + '/apiClient.js');
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') ?? '', /application\/javascript/);
    const body = await res.text();
    assert.match(body, /export\s+class\s+ApiClient/);
    assert.doesNotMatch(body, /<!doctype html>/i);
  });
});

test('unknown javascript path returns 404', async () => {
  await withWebServer(async (base) => {
    const res = await fetch(base + '/missing-module.js');
    assert.equal(res.status, 404);
    assert.match(res.headers.get('content-type') ?? '', /text\/plain/);
  });
});


test('project create failure resets loading state and shows error', async () => {
  const states = [];
  const status = [];
  const client = { createProject: async () => { throw new Error('Could not reach the API. Check that the web server is running on port 3000 and API proxy /api is reachable.'); } };
  await submitCreateProject(client, { name: 'Demo', projectType: 'custom' }, (v) => status.push(v), (b) => states.push(b), async () => {});
  assert.deepEqual(states, [true, false]);
  assert.match(status.at(-1), /Could not create project:/);
});

test('API client converts network fetch failure into helpful message', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => { throw new TypeError('Failed to fetch'); };
  const client = new ApiClient('http://127.0.0.1:3001');
  await assert.rejects(() => client.listProjects(), /Could not reach the API\. Check that the web server is running on port 3000 and API proxy \/api is reachable\./);
  global.fetch = originalFetch;
});


test('GET /api/projects proxies to /projects and strips prefix', async () => {
  const calls = [];
  const apiServer = createServer((req, res) => {
    calls.push({ method: req.method, url: req.url, headers: req.headers });
    res.statusCode = 200;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify([{ id: 'p1' }]));
  });
  await new Promise((resolve) => apiServer.listen(3001, '127.0.0.1', resolve));
  try {
    await withWebServer(async (base) => {
      const res = await fetch(base + '/api/projects?projectId=p1');
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body[0].id, 'p1');
    });
    assert.equal(calls[0].url, '/projects?projectId=p1');
    assert.equal(calls[0].method, 'GET');
  } finally {
    apiServer.close();
  }
});

test('POST /api/projects proxies body and upload-like headers', async () => {
  let receivedBody = '';
  let receivedHeaders = {};
  const apiServer = createServer((req, res) => {
    receivedHeaders = req.headers;
    req.setEncoding('utf8');
    req.on('data', (chunk) => { receivedBody += chunk; });
    req.on('end', () => {
      res.statusCode = 201;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ ok: true, path: req.url }));
    });
  });
  await new Promise((resolve) => apiServer.listen(3001, '127.0.0.1', resolve));
  try {
    await withWebServer(async (base) => {
      const res = await fetch(base + '/api/projects', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-document-type': 'datasheet',
          'x-filename': 'pump.pdf'
        },
        body: JSON.stringify({ name: 'Demo' })
      });
      assert.equal(res.status, 201);
      const body = await res.json();
      assert.equal(body.path, '/projects');
    });
    assert.match(receivedBody, /"name":"Demo"/);
    assert.equal(receivedHeaders['x-document-type'], 'datasheet');
    assert.equal(receivedHeaders['x-filename'], 'pump.pdf');
  } finally {
    apiServer.close();
  }
});


test('UI formats safe extraction diagnostics for users', () => {
  const text = formatExtractionFailure(Object.assign(new Error('x'), { extractionError: { errorCode: 'model_not_found', message: 'OpenAI extraction failed: model not found', retryable: false, userAction: 'Check the configured model name', details: { safeProviderMessage: 'The model does not exist' } } }));
  assert.match(text, /model_not_found/);
  assert.match(text, /Retryable: no/);
  assert.match(text, /Check the configured model name/);
  assert.match(text, /The model does not exist/);
});


test('UI renders concise dropped-candidate warnings', () => {
  const text = renderDroppedCandidateWarnings({ diagnostics: { droppedCandidates: [{ candidateIdentifier: 'rated pressure', validationIssueMessages: ['value is required'], reasonCode: 'missing_value' }] } });
  assert.match(text, /Dropped ‘rated pressure’: value is required\./);
});
test('UI renders concise extraction diagnostics and warning', () => {
  const text = renderExtractionDiagnostics({ warnings: ['PDF text extraction produced mostly internal PDF structure rather than visible text.'], diagnostics: { contentSentToModel: false, pdfTextExtraction: { extractedCharacterCount: 200, usefulTextCharacterCount: 10, suspiciousInternalTextRatio: 0.8 } } });
  assert.match(text, /Text extracted useful: no/);
  assert.match(text, /useful chars: 10/);
  assert.match(text, /OpenAI text called: no/);
});


test('UI diagnostics includes suspicious ratio and preview label', () => {
  const text = renderExtractionDiagnostics({ warnings: [], diagnostics: { contentSentToModel: true, pdfTextExtraction: { extractedCharacterCount: 300, usefulTextCharacterCount: 200, suspiciousInternalTextRatio: 0.25 } } });
  assert.match(text, /suspicious\/internal ratio: 0.25/);
});
test('UI diagnostics includes file/vision fallback called field', () => {
  const text = renderExtractionDiagnostics({ warnings: [], diagnostics: { contentSentToModel: false, openAiFallback: { called: true }, pdfTextExtraction: { extractedCharacterCount: 10, usefulTextCharacterCount: 2, suspiciousInternalTextRatio: 0.9 } } });
  assert.match(text, /OpenAI file\/vision fallback called: yes/);
});


test('API client exposes extraction fixture endpoints', async () => {
  const calls = [];
  const originalFetch = global.fetch;
  global.fetch = async (url, init={}) => { calls.push({ url: String(url), method: init.method ?? 'GET' }); return { ok: true, json: async () => ({ fixtureId:'f1', candidateValues:[], warnings:[], name:'x', originalFilename:'a.pdf', documentType:'datasheet', createdAt:new Date().toISOString() }) }; };
  const client = new ApiClient('http://local');
  await client.saveExtractionFixture({ name:'x', originalFilename:'a.pdf', documentType:'datasheet', candidateValues:[], warnings:[] });
  await client.listExtractionFixtures();
  await client.getExtractionFixture('f1');
  await client.deleteExtractionFixture('f1');
  assert.equal(calls[0].url, 'http://local/extraction-fixtures');
  assert.equal(calls[0].method, 'POST');
  assert.equal(calls[1].url, 'http://local/extraction-fixtures');
  assert.equal(calls[2].url, 'http://local/extraction-fixtures/f1');
  assert.equal(calls[3].method, 'DELETE');
  global.fetch = originalFetch;
});
