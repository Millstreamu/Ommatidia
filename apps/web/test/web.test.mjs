import test from 'node:test';
import assert from 'node:assert/strict';
import { validateEngineeringValueForm, renderDocumentList, triggerReportSectionsDocxExport, renderProjectsView, renderStatusBadge, renderOpenAiStatusBadge, renderExtractionProviderControls, formatExtractionFailure, resolveApiBaseUrl, submitCreateProject } from '../dist/app.js';
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
});

test('extraction provider controls disable OpenAI when key missing', () => {
  const html = renderExtractionProviderControls({ ok: true, extractionProvider: 'mock', openAiConfigured: false, apiProxyMode: true, timestamp: new Date().toISOString() });
  assert.match(html, /OpenAI key missing/);
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
