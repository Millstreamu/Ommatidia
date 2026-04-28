import { z, infer as zInfer } from 'zod';

export const valueTypeSchema = z.enum(['number', 'string', 'boolean', 'table', 'list']);
export type ValueType = zInfer<typeof valueTypeSchema>;

export const dataStatusSchema = z.enum([
  'ai_extracted',
  'needs_review',
  'approved',
  'rejected',
  'user_entered',
  'superseded'
]);
export type DataStatus = zInfer<typeof dataStatusSchema>;

export const boundingBoxSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number()
});
export type BoundingBox = zInfer<typeof boundingBoxSchema>;

export const sourceReferenceSchema = z.object({
  documentId: z.string(),
  pageNumber: z.number().optional(),
  sectionTitle: z.string().optional(),
  sourceText: z.string().optional(),
  boundingBox: boundingBoxSchema.optional()
});
export type SourceReference = zInfer<typeof sourceReferenceSchema>;

export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  projectType: z.string(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type Project = zInfer<typeof projectSchema>;

export const documentSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  title: z.string(),
  fileName: z.string(),
  mimeType: z.string(),
  uploadedAt: z.string(),
  uploadedBy: z.string().optional()
});
export type Document = zInfer<typeof documentSchema>;

export const componentSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  name: z.string(),
  type: z.string(),
  description: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type Component = zInfer<typeof componentSchema>;

export const engineeringValueSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  componentId: z.string().optional(),
  documentId: z.string().optional(),
  key: z.string(),
  label: z.string(),
  value: z.union([z.number(), z.string(), z.boolean(), z.array(z.record(z.any())), z.array(z.any())]),
  valueType: valueTypeSchema,
  unit: z.string().optional(),
  status: dataStatusSchema,
  sourceReferences: z.array(sourceReferenceSchema),
  confidence: z.number().optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type EngineeringValue = zInfer<typeof engineeringValueSchema>;

export const moduleTypeSchema = z.enum([
  'extraction',
  'summary',
  'comparison',
  'calculation',
  'checklist',
  'report'
]);
export type ModuleType = zInfer<typeof moduleTypeSchema>;

export const moduleInputSchema = z.object({
  key: z.string(),
  label: z.string(),
  description: z.string().optional(),
  valueType: valueTypeSchema,
  unit: z.string().optional(),
  required: z.boolean()
});
export type ModuleInput = zInfer<typeof moduleInputSchema>;

export const moduleOutputSchema = z.object({
  key: z.string(),
  label: z.string(),
  description: z.string().optional(),
  valueType: valueTypeSchema,
  unit: z.string().optional(),
  required: z.boolean()
});
export type ModuleOutput = zInfer<typeof moduleOutputSchema>;

export const engineeringModuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  moduleType: moduleTypeSchema,
  applicableProjectTypes: z.array(z.string()),
  inputs: z.array(moduleInputSchema),
  outputs: z.array(moduleOutputSchema),
  validationRules: z.array(z.string()).optional(),
  calculationMethod: z.string().optional(),
  reportTemplate: z.string().optional()
});
export type EngineeringModule = zInfer<typeof engineeringModuleSchema>;

export const moduleValueSchema = z.object({
  key: z.string(),
  label: z.string(),
  value: z.union([z.number(), z.string(), z.boolean(), z.array(z.record(z.any())), z.array(z.any())]),
  valueType: valueTypeSchema,
  unit: z.string().optional()
});
export type ModuleValue = zInfer<typeof moduleValueSchema>;

export const calculationResultSchema = z.object({
  moduleId: z.string(),
  projectId: z.string(),
  inputsUsed: z.array(moduleValueSchema),
  outputs: z.array(moduleValueSchema),
  warnings: z.array(z.string()),
  assumptions: z.array(z.string()),
  createdAt: z.string()
});
export type CalculationResult = zInfer<typeof calculationResultSchema>;

export const reportSectionSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  title: z.string(),
  bodyMarkdown: z.string(),
  sourceReferences: z.array(sourceReferenceSchema),
  status: dataStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string()
});
export type ReportSection = zInfer<typeof reportSectionSchema>;

export const exampleProject: Project = {
  id: 'proj_hpu_001',
  name: 'Harbor Crane Hydraulic Upgrade',
  description: 'Hydraulic redesign for dockside crane.',
  projectType: 'hydraulic_system',
  createdAt: '2026-01-12T09:00:00.000Z',
  updatedAt: '2026-01-12T09:00:00.000Z'
};

export const exampleDocument: Document = {
  id: 'doc_spec_001',
  projectId: exampleProject.id,
  title: 'Pump datasheet rev A',
  fileName: 'pump-datasheet-rev-a.pdf',
  mimeType: 'application/pdf',
  uploadedAt: '2026-01-12T10:00:00.000Z',
  uploadedBy: 'engineer@example.com'
};

export const exampleComponent: Component = {
  id: 'cmp_pump_001',
  projectId: exampleProject.id,
  name: 'Main hydraulic pump',
  type: 'pump',
  description: 'Primary pump for pressure generation.',
  createdAt: '2026-01-12T10:30:00.000Z',
  updatedAt: '2026-01-12T10:30:00.000Z'
};

export const exampleEngineeringValue: EngineeringValue = {
  id: 'engv_001',
  projectId: exampleProject.id,
  componentId: exampleComponent.id,
  documentId: exampleDocument.id,
  key: 'rated_pressure',
  label: 'Rated pressure',
  value: 210,
  valueType: 'number',
  unit: 'bar',
  status: 'needs_review',
  sourceReferences: [
    {
      documentId: exampleDocument.id,
      pageNumber: 4,
      sectionTitle: 'Operating limits',
      sourceText: 'Rated pressure: 210 bar',
      boundingBox: undefined
    }
  ],
  confidence: 0.86,
  notes: 'Extracted from table row 3.',
  createdAt: '2026-01-12T10:45:00.000Z',
  updatedAt: '2026-01-12T10:45:00.000Z'
};

export const exampleEngineeringModule: EngineeringModule = {
  id: 'mod_hydraulic_power_001',
  name: 'Hydraulic power summary',
  description: 'Computes hydraulic power from flow and pressure.',
  moduleType: 'calculation',
  applicableProjectTypes: ['hydraulic_system', 'custom'],
  inputs: [
    {
      key: 'flow_rate',
      label: 'Flow rate',
      valueType: 'number',
      unit: 'L/min',
      required: true,
      description: 'Operating flow at design point.'
    },
    {
      key: 'pressure',
      label: 'Pressure',
      valueType: 'number',
      unit: 'bar',
      required: true,
      description: 'Operating pressure at design point.'
    }
  ],
  outputs: [
    {
      key: 'hydraulic_power',
      label: 'Hydraulic power',
      valueType: 'number',
      unit: 'kW',
      required: true,
      description: 'Calculated hydraulic shaft-equivalent power.'
    }
  ],
  validationRules: ['flow_rate > 0', 'pressure > 0'],
  calculationMethod: 'P(kW) = Q(L/min) * p(bar) / 600',
  reportTemplate: undefined
};

export const exampleReportSection: ReportSection = {
  id: 'rptsec_001',
  projectId: exampleProject.id,
  title: 'Design Inputs Summary',
  bodyMarkdown: 'Candidate values are listed for engineering review before approval.',
  sourceReferences: exampleEngineeringValue.sourceReferences,
  status: 'needs_review',
  createdAt: '2026-01-12T11:00:00.000Z',
  updatedAt: '2026-01-12T11:00:00.000Z'
};
