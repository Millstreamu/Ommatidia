import test from 'node:test';
import assert from 'node:assert/strict';
import { MockExtractionService, OpenAiExtractionService, RetryingExtractionService } from '../dist/index.js';

const doc = { id:'d',projectId:'p',originalFilename:'a.pdf',storedFilename:'a.pdf',mimeType:'application/pdf',fileSizeBytes:1,documentType:'datasheet',uploadStatus:'uploaded',processingStatus:'uploaded',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString() };

test('mock extraction returns deterministic valid candidate engineering values', async () => { const service = new MockExtractionService(); const result = await service.extractEngineeringValues({ projectId:'p',documentId:'d',document:doc,documentFilePath:'/tmp/a.pdf' }); assert.equal(result.candidateValues[0].key, 'nominal_pressure'); });
test('missing OPENAI_API_KEY returns missing_api_key', () => { const old = process.env.OPENAI_API_KEY; delete process.env.OPENAI_API_KEY; assert.throws(() => OpenAiExtractionService.fromEnv(), /OPENAI_API_KEY/); process.env.OPENAI_API_KEY = old; });
test('invalid json response returns invalid_json_response', async () => { const svc = new OpenAiExtractionService({ responses: { create: async () => ({ output_text: '{bad' }) } }); await assert.rejects(() => svc.extractEngineeringValues({ projectId:'p',documentId:'d',document:doc,documentFilePath:'/tmp/nope.pdf' }), /invalid JSON/i); });
test('openai zero values adds visible warning', async () => { const svc = new OpenAiExtractionService({ responses: { create: async () => ({ output_text: '{"candidateValues":[],"missingInformation":[],"warnings":[]}' }) } }); const result = await svc.extractEngineeringValues({ projectId:'p',documentId:'d',document:doc,documentFilePath:'/tmp/nope.pdf' }); assert.match(result.warnings.join(' | '), /No engineering values were extracted/i); });
test('timeout returns request_timeout', async () => { const slow = { extractEngineeringValues: async () => { await new Promise((r) => setTimeout(r, 50)); return { candidateValues: [], missingInformation: [], warnings: [] }; } }; const svc = new RetryingExtractionService(slow, 1, 0); await assert.rejects(() => svc.extractEngineeringValues({}), /timed out/); });
