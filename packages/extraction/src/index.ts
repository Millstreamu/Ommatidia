declare const process: { env: Record<string,string|undefined> };
import { engineeringValueSchema, type Document, type EngineeringValue } from '@ommatidia/shared';

export interface ExtractEngineeringValuesInput {
  projectId: string;
  documentId: string;
  document: Document;
  documentFilePath: string;
  extractionTarget?: { componentType?: string; moduleType?: string };
}

export interface ExtractEngineeringValuesResult {
  candidateValues: EngineeringValue[];
  missingInformation: string[];
  warnings: string[];
  providerMetadata?: { provider: 'mock' | 'openai'; model?: string };
}

export interface ExtractionService {
  extractEngineeringValues(input: ExtractEngineeringValuesInput): Promise<ExtractEngineeringValuesResult>;
}

export class MockExtractionService implements ExtractionService {
  async extractEngineeringValues(input: ExtractEngineeringValuesInput): Promise<ExtractEngineeringValuesResult> {
    const now = new Date().toISOString();
    return {
      candidateValues: [engineeringValueSchema.parse({
        id: `mock-${input.documentId}-nominal_pressure`,
        projectId: input.projectId,
        documentId: input.documentId,
        key: 'nominal_pressure',
        label: 'Nominal Pressure',
        value: 210,
        valueType: 'number',
        unit: 'bar',
        status: 'needs_review',
        sourceReferences: [{ documentId: input.documentId, sectionTitle: 'Mock extraction output', sourceText: 'Nominal pressure 210 bar (mock).' }],
        confidence: 0.72,
        notes: 'Deterministic mock output for tests/local development.',
        createdAt: now,
        updatedAt: now
      })],
      missingInformation: ['operating_temperature'],
      warnings: ['Using mock extraction service; no model call was made.'],
      providerMetadata: { provider: 'mock' }
    };
  }
}

const extractionPrompt = `You are extracting candidate engineering values from a document.\n- Extract only values supported by the document.\n- Preserve original units.\n- Never guess missing values.\n- Include missing_information list for required unknowns.\n- Flag uncertainty in warnings.\n- Never mark any value as approved. Use needs_review or ai_extracted only.\n- Never fabricate page numbers or quoted source text.\n- Return valid JSON only matching the expected schema.`;

export class OpenAiExtractionService implements ExtractionService {
  constructor(private readonly client: { responses: { create: (input: unknown) => Promise<{ output_text?: string }> } }, private readonly model = 'gpt-4.1-mini') {}

  static fromEnv(): OpenAiExtractionService {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY is required for OpenAI extraction service.');
    const client = { responses: { create: async () => ({ output_text: '{"candidateValues":[],"missingInformation":["ocr_not_available"],"warnings":["TODO: wire OpenAI SDK and document text extraction before production use."]}' }) } };
    void apiKey;
    return new OpenAiExtractionService(client);
  }

  async extractEngineeringValues(input: ExtractEngineeringValuesInput): Promise<ExtractEngineeringValuesResult> {
    const fileInfo = `Document id: ${input.documentId}, type: ${input.document.documentType}, mime: ${input.document.mimeType}, file path: ${input.documentFilePath}`;
    // TODO: add direct file/PDF content ingestion when repository introduces OCR/document text extraction.
    const response = await this.client.responses.create({
      model: this.model,
      input: [
        { role: 'system', content: extractionPrompt },
        { role: 'user', content: `Extract candidate values from: ${fileInfo}. Optional target: ${JSON.stringify(input.extractionTarget ?? {})}` }
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'extraction_result',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              candidateValues: { type: 'array', items: { type: 'object', additionalProperties: true } },
              missingInformation: { type: 'array', items: { type: 'string' } },
              warnings: { type: 'array', items: { type: 'string' } }
            },
            required: ['candidateValues', 'missingInformation', 'warnings'],
            additionalProperties: false
          }
        }
      }
    });

    const text = response.output_text || '{"candidateValues":[],"missingInformation":[],"warnings":["No output."]}';
    const parsed = JSON.parse(text) as { candidateValues: Array<Record<string, unknown>>; missingInformation: string[]; warnings: string[] };
    const now = new Date().toISOString();
    const candidateValues = parsed.candidateValues.map((v, index) => engineeringValueSchema.parse({
      ...v,
      id: String(v.id ?? `ai-${input.documentId}-${index}`),
      projectId: input.projectId,
      documentId: input.documentId,
      status: v.status === 'ai_extracted' ? 'ai_extracted' : 'needs_review',
      sourceReferences: Array.isArray(v.sourceReferences) ? v.sourceReferences : [],
      createdAt: String(v.createdAt ?? now),
      updatedAt: String(v.updatedAt ?? now)
    }));

    return { candidateValues, missingInformation: parsed.missingInformation, warnings: parsed.warnings, providerMetadata: { provider: 'openai', model: this.model } };
  }
}

export function createExtractionService(mode = process.env.EXTRACTION_SERVICE ?? 'mock'): ExtractionService {
  return mode === 'openai' ? OpenAiExtractionService.fromEnv() : new MockExtractionService();
}
