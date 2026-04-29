import type { CalculationResult, DataStatus, EngineeringValue, ReportSection, SourceReference } from '@ommatidia/shared';

export type ReportSectionType =
  | 'component_summary'
  | 'calculation_summary'
  | 'assumptions_and_warnings'
  | 'missing_information'
  | 'source_references';

export interface ReportGenerationInput {
  projectId: string;
  componentId?: string;
  sectionType: ReportSectionType;
  engineeringValues: EngineeringValue[];
  calculationResults?: CalculationResult[];
  missingInformation?: string[];
  assumptions?: string[];
  warnings?: string[];
  sourceReferences?: SourceReference[];
  includedStatuses?: DataStatus[];
}

const DEFAULT_INCLUDED_STATUSES: DataStatus[] = ['approved', 'user_entered'];

function normalizeValue(value: EngineeringValue['value']): string {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    ? String(value)
    : JSON.stringify(value);
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim())));
}

function mergeSourceReferences(input: ReportGenerationInput, filteredValues: EngineeringValue[]): SourceReference[] {
  return [...(input.sourceReferences ?? []), ...filteredValues.flatMap((value) => value.sourceReferences)];
}

export function generateReportSection(input: ReportGenerationInput): ReportSection {
  const now = new Date().toISOString();
  const includedStatuses = input.includedStatuses ?? DEFAULT_INCLUDED_STATUSES;
  const filteredValues = input.engineeringValues.filter((value) => {
    if (value.projectId !== input.projectId) return false;
    if (input.componentId && value.componentId !== input.componentId) return false;
    return includedStatuses.includes(value.status);
  });

  const sourceReferences = mergeSourceReferences(input, filteredValues);

  const sectionTemplates: Record<ReportSectionType, { title: string; body: () => string }> = {
    component_summary: {
      title: 'Component Summary',
      body: () => [
        '## Included Engineering Values',
        ...filteredValues.map((value) => `- **${value.label}** (${value.key}): ${normalizeValue(value.value)}${value.unit ? ` ${value.unit}` : ''} _[${value.status}]_`),
        filteredValues.length === 0 ? '- No approved or user-entered values available.' : ''
      ].filter(Boolean).join('\n')
    },
    calculation_summary: {
      title: 'Calculation Summary',
      body: () => {
        const results = (input.calculationResults ?? []).filter((result) => result.projectId === input.projectId);
        if (results.length === 0) return '## Calculation Outputs\n- No deterministic calculation results available.';
        return [
          '## Calculation Outputs',
          ...results.map((result) => [
            `### ${result.moduleId}`,
            ...result.outputs.map((output) => `- **${output.label}**: ${String(output.value)}${output.unit ? ` ${output.unit}` : ''}`)
          ].join('\n'))
        ].join('\n');
      }
    },
    assumptions_and_warnings: {
      title: 'Assumptions and Warnings',
      body: () => {
        const assumptions = uniqueStrings([...(input.assumptions ?? []), ...((input.calculationResults ?? []).flatMap((result) => result.assumptions))]);
        const warnings = uniqueStrings([...(input.warnings ?? []), ...((input.calculationResults ?? []).flatMap((result) => result.warnings))]);
        return [
          '## Assumptions',
          ...(assumptions.length > 0 ? assumptions.map((item) => `- ${item}`) : ['- None provided.']),
          '',
          '## Warnings',
          ...(warnings.length > 0 ? warnings.map((item) => `- ${item}`) : ['- None provided.'])
        ].join('\n');
      }
    },
    missing_information: {
      title: 'Missing Information',
      body: () => {
        const missing = uniqueStrings(input.missingInformation ?? []);
        return ['## Missing Information', ...(missing.length > 0 ? missing.map((item) => `- ${item}`) : ['- No missing information reported.'])].join('\n');
      }
    },
    source_references: {
      title: 'Source References',
      body: () => {
        if (sourceReferences.length === 0) return '## Source References\n- No source references available.';
        return [
          '## Source References',
          ...sourceReferences.map((source) => `- Document: ${source.documentId}${source.pageNumber ? `, Page: ${source.pageNumber}` : ''}${source.sectionTitle ? `, Section: ${source.sectionTitle}` : ''}${source.sourceText ? `\n  - Excerpt: ${source.sourceText}` : ''}`)
        ].join('\n');
      }
    }
  };

  const sectionTemplate = sectionTemplates[input.sectionType];
  return {
    id: `rep-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    projectId: input.projectId,
    title: sectionTemplate.title,
    bodyMarkdown: sectionTemplate.body(),
    sourceReferences,
    status: 'needs_review',
    createdAt: now,
    updatedAt: now
  };
}
