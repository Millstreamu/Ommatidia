declare const process: { env: Record<string,string|undefined> };
import { engineeringValueSchema, type Document, type EngineeringValue } from '@ommatidia/shared';

export type ExtractionErrorCode =
  | 'missing_api_key' | 'invalid_api_key' | 'permission_denied' | 'provider_unavailable' | 'request_timeout' | 'rate_limited' | 'model_not_found' | 'bad_request' | 'network_failure' | 'invalid_model_response' | 'invalid_json_response'
  | 'schema_invalid_response' | 'unsupported_response_shape' | 'no_document_content'
  | 'file_not_found' | 'unsupported_file_type' | 'file_too_large' | 'extraction_failed' | 'unknown_error';
export interface ExtractionErrorResponse { errorCode: ExtractionErrorCode; message: string; retryable: boolean; userAction?: string; details?: Record<string, unknown>; timestamp: string; }
export class ExtractionError extends Error { constructor(public readonly payload: ExtractionErrorResponse) { super(payload.message); } }
export interface ExtractEngineeringValuesInput { projectId: string; documentId: string; document: Document; documentFilePath: string; extractionTarget?: { componentType?: string; moduleType?: string }; }
export interface DroppedCandidateDiagnostic { candidateIdentifier?: string; reasonCode: 'missing_value' | 'invalid_value_type' | 'invalid_source_references' | 'schema_validation_failed'; validationIssuePaths: string[]; validationIssueMessages: string[]; missingRequiredFields: boolean; }
export interface ExtractionDiagnostics { documentFilename: string; documentMimeType: string; contentRead: boolean; contentSentToModel: boolean; rawCandidateCount: number; invalidCandidateCount: number; skippedApprovedConflictCount: number; droppedCandidates?: DroppedCandidateDiagnostic[]; }
export interface ExtractEngineeringValuesResult { candidateValues: EngineeringValue[]; missingInformation: string[]; warnings: string[]; providerMetadata?: { provider: 'mock' | 'openai'; model?: string }; diagnostics?: ExtractionDiagnostics; }
export interface ExtractionService { extractEngineeringValues(input: ExtractEngineeringValuesInput): Promise<ExtractEngineeringValuesResult>; }
export function normalizedExtractionError(errorCode: ExtractionErrorCode, message: string, retryable = false, options?: { userAction?: string; details?: Record<string, unknown> }): ExtractionErrorResponse { return { errorCode, message, retryable, userAction: options?.userAction, details: options?.details, timestamp: new Date().toISOString() }; }

const RETRYABLE = new Set<ExtractionErrorCode>(['provider_unavailable', 'request_timeout', 'rate_limited', 'network_failure']);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const SUPPORTED_MIME = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp']);
const DEFAULT_OPENAI_MODEL = 'gpt-4.1-mini';

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> { return new Promise((resolve, reject) => { const t = setTimeout(() => reject(new ExtractionError(normalizedExtractionError('request_timeout', `Extraction timed out after ${timeoutMs}ms`, true, { userAction: 'Try again in a moment.' }))), timeoutMs); promise.then((v) => { clearTimeout(t); resolve(v); }).catch((e) => { clearTimeout(t); reject(e); }); }); }

function sanitizeProviderMessage(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const compact = value.replace(/\s+/g, ' ').trim();
  if (!compact) return undefined;
  const redacted = compact
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]')
    .replace(/sk-[A-Za-z0-9_-]+/g, 'sk-[REDACTED]')
    .replace(/authorization/gi, '[redacted-header]');
  return redacted.slice(0, 240);
}

function toDiagnosticError(errorCode: ExtractionErrorCode, message: string, retryable: boolean, options: { model: string; statusCode?: number; errorType?: string; safeProviderMessage?: string; userAction: string }): ExtractionError {
  return new ExtractionError(normalizedExtractionError(errorCode, message, retryable, { userAction: options.userAction, details: { provider: 'openai', model: options.model, statusCode: options.statusCode, errorType: options.errorType, safeProviderMessage: options.safeProviderMessage, retryable, userAction: options.userAction } }));
}

function mapOpenAiError(error: unknown, model: string): ExtractionError {
  const raw = error as { status?: number; code?: string; type?: string; message?: string; name?: string; error?: { type?: string; code?: string; message?: string } };
  const statusCode = typeof raw?.status === 'number' ? raw.status : undefined;
  const errorType = typeof raw?.type === 'string' ? raw.type : (typeof raw?.error?.type === 'string' ? raw.error.type : undefined);
  const errorCode = typeof raw?.code === 'string' ? raw.code : (typeof raw?.error?.code === 'string' ? raw.error.code : undefined);
  const safeProviderMessage = sanitizeProviderMessage(raw?.error?.message ?? raw?.message ?? (error instanceof Error ? error.message : undefined));

  if (statusCode === 401 || errorCode === 'invalid_api_key' || errorType === 'invalid_request_error' && safeProviderMessage?.toLowerCase().includes('api key')) {
    return toDiagnosticError('invalid_api_key', 'OpenAI extraction failed: invalid API key.', false, { model, statusCode, errorType, safeProviderMessage, userAction: 'Verify OPENAI_API_KEY on the server.' });
  }
  if (statusCode === 403) {
    return toDiagnosticError('permission_denied', 'OpenAI extraction failed: permission denied.', false, { model, statusCode, errorType, safeProviderMessage, userAction: 'Check project permissions and model access for this API key.' });
  }
  if (statusCode === 404 || errorCode === 'model_not_found') {
    return toDiagnosticError('model_not_found', 'OpenAI extraction failed: model not found.', false, { model, statusCode, errorType, safeProviderMessage, userAction: 'Check the configured model name.' });
  }
  if (statusCode === 408 || statusCode === 504 || errorCode === 'request_timeout') {
    return toDiagnosticError('request_timeout', 'OpenAI extraction request timed out.', true, { model, statusCode, errorType, safeProviderMessage, userAction: 'Retry in a moment.' });
  }
  if (statusCode === 429) {
    return toDiagnosticError('rate_limited', 'OpenAI extraction failed: rate limit reached.', true, { model, statusCode, errorType, safeProviderMessage, userAction: 'Wait and retry, or reduce request frequency.' });
  }
  if (statusCode === 400 || errorType === 'invalid_request_error') {
    return toDiagnosticError('bad_request', 'OpenAI extraction failed: invalid request payload.', false, { model, statusCode, errorType, safeProviderMessage, userAction: 'Review extraction request configuration and model settings.' });
  }
  const msg = safeProviderMessage?.toLowerCase() ?? '';
  if ((error instanceof TypeError) || msg.includes('network') || msg.includes('fetch') || errorCode === 'api_connection_error') {
    return toDiagnosticError('network_failure', 'OpenAI extraction failed: network connection issue.', true, { model, statusCode, errorType, safeProviderMessage, userAction: 'Check network connectivity and retry.' });
  }
  return toDiagnosticError('provider_unavailable', 'OpenAI extraction failed: provider unavailable.', true, { model, statusCode, errorType, safeProviderMessage, userAction: 'Retry shortly.' });
}



function safeCandidateIdentifier(candidate: Record<string, unknown>): string | undefined {
  const label = typeof candidate.label === 'string' ? candidate.label.trim() : '';
  const key = typeof candidate.key === 'string' ? candidate.key.trim() : '';
  return label || key || undefined;
}
function toSafeKey(label: string): string {
  const cleaned = label.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return cleaned || 'extracted_value';
}
function inferValueType(value: unknown): 'number'|'string'|'boolean'|'list'|'table' {
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (Array.isArray(value)) return value.every((item) => typeof item === 'object' && item !== null && !Array.isArray(item)) ? 'table' : 'list';
  return 'string';
}
function normalizeCandidate(raw: Record<string, unknown>, input: ExtractEngineeringValuesInput, index: number, now: string): Record<string, unknown> {
  const notes: string[] = [];
  const candidate = { ...raw };
  if (typeof candidate.id !== 'string' || !candidate.id.trim()) { candidate.id = `ai-${input.documentId}-${index}`; notes.push('id generated'); }
  if (typeof candidate.projectId !== 'string' || !candidate.projectId.trim()) { candidate.projectId = input.projectId; notes.push('projectId set from extraction input'); }
  if (typeof candidate.documentId !== 'string' || !candidate.documentId.trim()) { candidate.documentId = input.documentId; notes.push('documentId set from extraction input'); }
  candidate.status = candidate.status === 'ai_extracted' ? 'ai_extracted' : 'needs_review';
  if (typeof raw.status !== 'string') notes.push('status defaulted to needs_review');
  if (typeof candidate.createdAt !== 'string' || !candidate.createdAt.trim()) { candidate.createdAt = now; notes.push('createdAt added'); }
  if (typeof candidate.updatedAt !== 'string' || !candidate.updatedAt.trim()) { candidate.updatedAt = now; notes.push('updatedAt added'); }
  if (!Array.isArray(candidate.sourceReferences)) { candidate.sourceReferences = []; notes.push('sourceReferences defaulted to empty array'); }
  if ((typeof candidate.key !== 'string' || !candidate.key.trim()) && typeof candidate.label === 'string' && candidate.label.trim()) { candidate.key = toSafeKey(candidate.label); notes.push('key generated from label'); }
  if (typeof candidate.valueType !== 'string' || !candidate.valueType.trim()) { candidate.valueType = inferValueType(candidate.value); notes.push(`valueType inferred as ${candidate.valueType}`); }
  if (notes.length) {
    const existing = typeof candidate.notes === 'string' && candidate.notes.trim() ? `${candidate.notes} | ` : '';
    candidate.notes = `${existing}Normalization: ${notes.join('; ')}`;
  }
  return candidate;
}
function formatDroppedWarnings(dropped: DroppedCandidateDiagnostic[]): string[] {
  const grouped = new Map<string, number>();
  for (const item of dropped) grouped.set(item.reasonCode, (grouped.get(item.reasonCode) ?? 0) + 1);
  const map: Record<string,string> = { missing_value: 'missing value field', invalid_value_type: 'invalid valueType', invalid_source_references: 'sourceReferences was not an array', schema_validation_failed: 'failed schema validation' };
  return Array.from(grouped.entries()).map(([code, count]) => `Dropped ${count} candidate${count===1?'':'s'}: ${map[code] ?? code}.`);
}

export class MockExtractionService implements ExtractionService {
  async extractEngineeringValues(input: ExtractEngineeringValuesInput): Promise<ExtractEngineeringValuesResult> {
    const now = new Date().toISOString();
    return { candidateValues: [engineeringValueSchema.parse({ id: `mock-${input.documentId}-nominal_pressure`, projectId: input.projectId, documentId: input.documentId, key: 'nominal_pressure', label: 'Nominal Pressure', value: 210, valueType: 'number', unit: 'bar', status: 'needs_review', sourceReferences: [{ documentId: input.documentId, sectionTitle: 'Mock extraction output', sourceText: 'Nominal pressure 210 bar (mock).' }], confidence: 0.72, notes: 'Deterministic mock output for tests/local development.', createdAt: now, updatedAt: now })], missingInformation: ['operating_temperature'], warnings: ['Using mock extraction service; no model call was made.'], providerMetadata: { provider: 'mock' }, diagnostics: { documentFilename: input.document.originalFilename, documentMimeType: input.document.mimeType, contentRead: true, contentSentToModel: false, rawCandidateCount: 1, invalidCandidateCount: 0, skippedApprovedConflictCount: 0 } };
  }
}

export class OpenAiExtractionService implements ExtractionService {
  constructor(private readonly client: { responses: { create: (input: unknown) => Promise<Record<string, unknown>> } }, private readonly model = DEFAULT_OPENAI_MODEL) {}
  static resolveModelFromEnv(): string { return (process.env.OPENAI_EXTRACTION_MODEL ?? DEFAULT_OPENAI_MODEL).trim() || DEFAULT_OPENAI_MODEL; }
  static fromEnv(): OpenAiExtractionService {
    const apiKey = process.env.OPENAI_API_KEY;
    const model = OpenAiExtractionService.resolveModelFromEnv();
    if (!apiKey) throw new ExtractionError(normalizedExtractionError('missing_api_key', 'OPENAI_API_KEY is required for OpenAI extraction.', false, { userAction: 'Set OPENAI_API_KEY or use mock provider.', details: { provider: 'openai', model, retryable: false } }));
    const client = { responses: { create: async (input: unknown) => {
      const response = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` }, body: JSON.stringify(input) });
      const responseJson = await response.json().catch(() => undefined) as { error?: { message?: string; type?: string; code?: string } } | undefined;
      if (!response.ok) {
        const err = new Error(responseJson?.error?.message ?? `OpenAI request failed (${response.status})`) as Error & { status?: number; type?: string; code?: string; error?: { message?: string; type?: string; code?: string } };
        err.status = response.status;
        err.type = responseJson?.error?.type;
        err.code = responseJson?.error?.code;
        err.error = responseJson?.error;
        throw err;
      }
      return (responseJson ?? {}) as Record<string, unknown>;
    } } };
    return new OpenAiExtractionService(client, model);
  }

  private getResponseText(response: Record<string, unknown>): string | undefined {
    const outputText = response.output_text;
    if (typeof outputText === 'string' && outputText.trim()) return outputText;
    const output = Array.isArray(response.output) ? response.output : [];
    const chunks: string[] = [];
    for (const item of output) {
      const content = Array.isArray((item as { content?: unknown[] }).content) ? (item as { content?: unknown[] }).content! : [];
      for (const block of content) {
        const text = (block as { text?: string }).text;
        if (typeof text === 'string' && text.trim()) chunks.push(text);
      }
    }
    return chunks.length ? chunks.join('\n') : undefined;
  }
  private buildSafeDiagnostics(response: Record<string, unknown>, documentContentIncluded: boolean, usedFileInput: boolean): Record<string, unknown> {
    const output = Array.isArray(response.output) ? response.output : [];
    const outputItemTypes = output.map((item) => (item as { type?: unknown }).type).filter((v) => typeof v === 'string');
    return { model: this.model, responseId: typeof response.id === 'string' ? response.id : undefined, outputItemTypes, status: typeof response.status === 'string' ? response.status : undefined, finishReason: typeof response.finish_reason === 'string' ? response.finish_reason : undefined, documentContentIncluded, usedFileInput };
  }

  async extractEngineeringValues(input: ExtractEngineeringValuesInput): Promise<ExtractEngineeringValuesResult> {
    if (!SUPPORTED_MIME.has(input.document.mimeType)) throw new ExtractionError(normalizedExtractionError('unsupported_file_type', 'Unsupported file type for OpenAI extraction.', false));
    const encodedDocument = (input.documentFilePath ?? '').trim();
    if (!encodedDocument) throw new ExtractionError(normalizedExtractionError('no_document_content', 'No document content was sent to the model.', false, { details: { model: this.model, documentContentIncluded: false, usedFileInput: false } }));
    const prompt = `Extract engineering candidate values from this document. Return strict JSON with keys candidateValues (array), missingInformation (array of strings), warnings (array of strings). For each candidate value include simple fields only: key, label, value, valueType, unit, confidence, notes, sourceReferences. valueType should be one of: number, string, boolean, list, table. sourceReferences must be an array when present. Do not include system metadata fields like id, projectId, documentId, createdAt, updatedAt; the application will add those. Preserve units from source. Do not invent missing values. Use statuses needs_review or ai_extracted only if you include status.`;
    let parsed: { candidateValues: Array<Record<string, unknown>>; missingInformation: string[]; warnings: string[] };
    try {
      const response = await this.client.responses.create({ model: this.model, input: [{ role: 'user', content: [{ type: 'input_text', text: prompt }, { type: 'input_text', text: `Document server path: ${encodedDocument}` }] }], text: { format: { type: 'json_object' } } });
      const responseText = this.getResponseText(response);
      if (!responseText) {
        throw new ExtractionError(normalizedExtractionError('invalid_model_response', 'Model returned empty output.', false, { userAction: 'Retry extraction or adjust prompt/model configuration.', details: this.buildSafeDiagnostics(response, true, false) }));
      }
      parsed = JSON.parse(responseText) as typeof parsed;
    } catch (error) {
      if (error instanceof ExtractionError) throw error;
      if (error instanceof SyntaxError) throw toDiagnosticError('invalid_json_response', 'Model returned invalid JSON.', false, { model: this.model, userAction: 'Retry extraction; if it repeats, switch model or provider.' });
      throw mapOpenAiError(error, this.model);
    }
    if (typeof parsed !== 'object' || parsed === null) throw toDiagnosticError('unsupported_response_shape', 'Model returned an unsupported response shape.', false, { model: this.model, userAction: 'Retry extraction; if it repeats, adjust extraction configuration.' });
    if (!Array.isArray(parsed.candidateValues) || !Array.isArray(parsed.missingInformation) || !Array.isArray(parsed.warnings)) throw toDiagnosticError('schema_invalid_response', 'Model response failed schema checks.', false, { model: this.model, userAction: 'Retry extraction; if it repeats, adjust extraction configuration.' });

    const now = new Date().toISOString(); const candidateValues: EngineeringValue[] = []; let invalidCandidateCount = 0; const droppedCandidates: DroppedCandidateDiagnostic[] = [];
    for (let index = 0; index < parsed.candidateValues.length; index += 1) {
      const v = parsed.candidateValues[index];
      const normalized = normalizeCandidate(v, input, index, now);
      try { candidateValues.push(engineeringValueSchema.parse(normalized)); } catch (error) { invalidCandidateCount += 1; const candidateIdentifier = safeCandidateIdentifier(normalized); const issues = error instanceof Error && 'issues' in error ? ((error as any).issues as Array<{ path?: Array<string|number>; message?: string }>) : []; const paths = issues.map((i) => Array.isArray(i.path) ? i.path.join('.') : '').filter(Boolean); const messages = issues.map((i) => i.message ?? '').filter(Boolean); const missingValue = normalized.value === undefined || normalized.value === null || (typeof normalized.value === 'string' && normalized.value.trim() === ''); const invalidValueType = messages.some((m) => m.toLowerCase().includes('valuetype')); const invalidSourceRefs = !Array.isArray(v.sourceReferences); droppedCandidates.push({ candidateIdentifier, reasonCode: missingValue ? 'missing_value' : invalidValueType ? 'invalid_value_type' : invalidSourceRefs ? 'invalid_source_references' : 'schema_validation_failed', validationIssuePaths: paths, validationIssueMessages: messages, missingRequiredFields: messages.some((m) => m.toLowerCase().includes('required')) || missingValue }); }
    }
    const warnings = [...parsed.warnings];
    if (candidateValues.length === 0) warnings.push('No engineering values were extracted from this document.');
    if (invalidCandidateCount > 0) warnings.push(...formatDroppedWarnings(droppedCandidates));
    return { candidateValues, missingInformation: parsed.missingInformation, warnings, providerMetadata: { provider: 'openai', model: this.model }, diagnostics: { documentFilename: input.document.originalFilename, documentMimeType: input.document.mimeType, contentRead: true, contentSentToModel: true, rawCandidateCount: parsed.candidateValues.length, invalidCandidateCount, skippedApprovedConflictCount: 0, droppedCandidates } };
  }
}

export class RetryingExtractionService implements ExtractionService { constructor(private readonly inner: ExtractionService, private readonly timeoutMs = Number(process.env.EXTRACTION_TIMEOUT_MS ?? 15000), private readonly maxRetries = Number(process.env.EXTRACTION_MAX_RETRIES ?? 2)) {} async extractEngineeringValues(input: ExtractEngineeringValuesInput): Promise<ExtractEngineeringValuesResult> { let attempt = 0; while (true) { try { return await withTimeout(this.inner.extractEngineeringValues(input), this.timeoutMs); } catch (error) { const e = error instanceof ExtractionError ? error : new ExtractionError(normalizedExtractionError('unknown_error', 'Unknown extraction error', false)); if (RETRYABLE.has(e.payload.errorCode) && attempt < this.maxRetries) { attempt += 1; await sleep(150 * attempt); continue; } throw e; } } } }
export function createExtractionService(mode = process.env.EXTRACTION_PROVIDER ?? 'mock'): ExtractionService { const base = mode === 'openai' ? OpenAiExtractionService.fromEnv() : new MockExtractionService(); return new RetryingExtractionService(base); }
export function getDefaultOpenAiExtractionModel(): string { return OpenAiExtractionService.resolveModelFromEnv(); }
export async function runOpenAiSmokeTest(): Promise<{ ok: boolean; provider: 'openai'; model: string; openAiConfigured: boolean; statusCode?: number; message: string; timestamp: string }> {
  const model = getDefaultOpenAiExtractionModel();
  const configured = Boolean(process.env.OPENAI_API_KEY?.trim());
  if (!configured) return { ok: false, provider: 'openai', model, openAiConfigured: false, message: 'OPENAI_API_KEY is not configured on the server.', timestamp: new Date().toISOString() };
  try {
    const service = OpenAiExtractionService.fromEnv();
    const response = await (service as any).client.responses.create({ model, input: [{ role: 'user', content: [{ type: 'input_text', text: 'Return exactly this JSON: {\"ok\":true}' }] }], text: { format: { type: 'json_object' } } });
    const text = (service as any).getResponseText(response);
    if (!text) return { ok: false, provider: 'openai', model, openAiConfigured: true, message: 'OpenAI responded but no output text was returned.', timestamp: new Date().toISOString() };
    return { ok: true, provider: 'openai', model, openAiConfigured: true, message: 'OpenAI test succeeded.', timestamp: new Date().toISOString() };
  } catch (error) {
    const mapped = mapOpenAiError(error, model).payload;
    return { ok: false, provider: 'openai', model, openAiConfigured: true, statusCode: typeof mapped.details?.statusCode === 'number' ? mapped.details.statusCode as number : undefined, message: mapped.message, timestamp: new Date().toISOString() };
  }
}
