declare const process: { env: Record<string,string|undefined> };
import { engineeringValueSchema, type Document, type EngineeringValue } from '@ommatidia/shared';

export type ExtractionErrorCode =
  | 'missing_api_key'
  | 'provider_unavailable'
  | 'request_timeout'
  | 'rate_limited'
  | 'invalid_model_response'
  | 'invalid_json_response'
  | 'file_not_found'
  | 'unsupported_file_type'
  | 'file_too_large'
  | 'extraction_failed'
  | 'unknown_error';

export interface ExtractionErrorResponse {
  errorCode: ExtractionErrorCode;
  message: string;
  retryable: boolean;
  userAction?: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export class ExtractionError extends Error {
  constructor(public readonly payload: ExtractionErrorResponse) { super(payload.message); }
}

export interface ExtractEngineeringValuesInput { projectId: string; documentId: string; document: Document; documentFilePath: string; extractionTarget?: { componentType?: string; moduleType?: string }; }
export interface ExtractEngineeringValuesResult { candidateValues: EngineeringValue[]; missingInformation: string[]; warnings: string[]; providerMetadata?: { provider: 'mock' | 'openai'; model?: string }; }
export interface ExtractionService { extractEngineeringValues(input: ExtractEngineeringValuesInput): Promise<ExtractEngineeringValuesResult>; }

export function normalizedExtractionError(errorCode: ExtractionErrorCode, message: string, retryable = false, options?: { userAction?: string; details?: Record<string, unknown> }): ExtractionErrorResponse {
  return { errorCode, message, retryable, userAction: options?.userAction, details: options?.details, timestamp: new Date().toISOString() };
}

const RETRYABLE = new Set<ExtractionErrorCode>(['provider_unavailable', 'request_timeout', 'rate_limited']);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new ExtractionError(normalizedExtractionError('request_timeout', `Extraction timed out after ${timeoutMs}ms`, true, { userAction: 'Try again in a moment.' }))), timeoutMs);
    promise.then((v) => { clearTimeout(t); resolve(v); }).catch((e) => { clearTimeout(t); reject(e); });
  });
}

export class MockExtractionService implements ExtractionService {
  async extractEngineeringValues(input: ExtractEngineeringValuesInput): Promise<ExtractEngineeringValuesResult> {
    const now = new Date().toISOString();
    return { candidateValues: [engineeringValueSchema.parse({ id: `mock-${input.documentId}-nominal_pressure`, projectId: input.projectId, documentId: input.documentId, key: 'nominal_pressure', label: 'Nominal Pressure', value: 210, valueType: 'number', unit: 'bar', status: 'needs_review', sourceReferences: [{ documentId: input.documentId, sectionTitle: 'Mock extraction output', sourceText: 'Nominal pressure 210 bar (mock).' }], confidence: 0.72, notes: 'Deterministic mock output for tests/local development.', createdAt: now, updatedAt: now })], missingInformation: ['operating_temperature'], warnings: ['Using mock extraction service; no model call was made.'], providerMetadata: { provider: 'mock' } };
  }
}

export class OpenAiExtractionService implements ExtractionService {
  constructor(private readonly client: { responses: { create: (input: unknown) => Promise<{ output_text?: string }> } }, private readonly model = 'gpt-4.1-mini') {}
  static fromEnv(): OpenAiExtractionService {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new ExtractionError(normalizedExtractionError('missing_api_key', 'OPENAI_API_KEY is required for OpenAI extraction.', false, { userAction: 'Set OPENAI_API_KEY or use mock provider.' }));
    const client = { responses: { create: async () => ({ output_text: '{"candidateValues":[],"missingInformation":[],"warnings":[]}' }) } };
    void apiKey;
    return new OpenAiExtractionService(client);
  }

  async extractEngineeringValues(input: ExtractEngineeringValuesInput): Promise<ExtractEngineeringValuesResult> {
    let parsed: { candidateValues: Array<Record<string, unknown>>; missingInformation: string[]; warnings: string[] };
    try {
      const response = await this.client.responses.create({ model: this.model, input: [{ role: 'user', content: `extract from ${input.document.id}` }] });
      if (!response.output_text) throw new ExtractionError(normalizedExtractionError('invalid_model_response', 'Model returned empty output.', false));
      try { parsed = JSON.parse(response.output_text) as typeof parsed; } catch { throw new ExtractionError(normalizedExtractionError('invalid_json_response', 'Model returned invalid JSON.', false, { userAction: 'Retry extraction.' })); }
    } catch (error) {
      if (error instanceof ExtractionError) throw error;
      throw new ExtractionError(normalizedExtractionError('provider_unavailable', 'AI provider is unavailable.', true, { userAction: 'Retry shortly.' }));
    }

    if (!Array.isArray(parsed.candidateValues) || !Array.isArray(parsed.missingInformation) || !Array.isArray(parsed.warnings)) {
      throw new ExtractionError(normalizedExtractionError('invalid_model_response', 'Model response failed schema checks.', false));
    }

    const now = new Date().toISOString();
    try {
      const candidateValues = parsed.candidateValues.map((v, index) => engineeringValueSchema.parse({ ...v, id: String(v.id ?? `ai-${input.documentId}-${index}`), projectId: input.projectId, documentId: input.documentId, status: v.status === 'ai_extracted' ? 'ai_extracted' : 'needs_review', sourceReferences: Array.isArray(v.sourceReferences) ? v.sourceReferences : [], createdAt: String(v.createdAt ?? now), updatedAt: String(v.updatedAt ?? now) }));
      return { candidateValues, missingInformation: parsed.missingInformation, warnings: parsed.warnings, providerMetadata: { provider: 'openai', model: this.model } };
    } catch {
      throw new ExtractionError(normalizedExtractionError('invalid_model_response', 'Model returned schema-invalid values.', false));
    }
  }
}

export class RetryingExtractionService implements ExtractionService {
  constructor(private readonly inner: ExtractionService, private readonly timeoutMs = Number(process.env.EXTRACTION_TIMEOUT_MS ?? 15000), private readonly maxRetries = Number(process.env.EXTRACTION_MAX_RETRIES ?? 2)) {}
  async extractEngineeringValues(input: ExtractEngineeringValuesInput): Promise<ExtractEngineeringValuesResult> {
    let attempt = 0;
    while (true) {
      try { return await withTimeout(this.inner.extractEngineeringValues(input), this.timeoutMs); } catch (error) {
        const e = error instanceof ExtractionError ? error : new ExtractionError(normalizedExtractionError('unknown_error', 'Unknown extraction error', false));
        if (RETRYABLE.has(e.payload.errorCode) && attempt < this.maxRetries) { attempt += 1; await sleep(150 * attempt); continue; }
        throw e;
      }
    }
  }
}

export function createExtractionService(mode = process.env.EXTRACTION_PROVIDER ?? 'mock'): ExtractionService {
  const base = mode === 'openai' ? OpenAiExtractionService.fromEnv() : new MockExtractionService();
  return new RetryingExtractionService(base);
}
