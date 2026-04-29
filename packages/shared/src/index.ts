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

export const documentTypeSchema = z.enum(['datasheet', 'manual', 'quote', 'schematic', 'drawing', 'other']);
export type DocumentType = zInfer<typeof documentTypeSchema>;

export const documentUploadStatusSchema = z.enum(['uploaded']);
export type DocumentUploadStatus = zInfer<typeof documentUploadStatusSchema>;

export const documentProcessingStatusSchema = z.enum(['uploaded', 'pending_processing', 'processed', 'failed']);
export type DocumentProcessingStatus = zInfer<typeof documentProcessingStatusSchema>;

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

export const projectSchema = z.object({ id: z.string(), name: z.string(), description: z.string().optional(), projectType: z.string(), createdAt: z.string(), updatedAt: z.string() });
export type Project = zInfer<typeof projectSchema>;

export const documentSchema = z.object({ id: z.string(), projectId: z.string(), originalFilename: z.string(), storedFilename: z.string(), mimeType: z.string(), fileSizeBytes: z.number(), documentType: documentTypeSchema, uploadStatus: documentUploadStatusSchema, processingStatus: documentProcessingStatusSchema, createdAt: z.string(), updatedAt: z.string() });
export type Document = zInfer<typeof documentSchema>;

export const componentSchema = z.object({ id: z.string(), projectId: z.string(), name: z.string(), type: z.string(), description: z.string().optional(), createdAt: z.string(), updatedAt: z.string() });
export type Component = zInfer<typeof componentSchema>;

export const engineeringValueSchema = z.object({ id: z.string(), projectId: z.string(), componentId: z.string().optional(), documentId: z.string().optional(), key: z.string(), label: z.string(), value: z.union([z.number(), z.string(), z.boolean(), z.array(z.record(z.any())), z.array(z.any())]), valueType: valueTypeSchema, unit: z.string().optional(), status: dataStatusSchema, sourceReferences: z.array(sourceReferenceSchema), confidence: z.number().optional(), notes: z.string().optional(), createdAt: z.string(), updatedAt: z.string() });
export type EngineeringValue = zInfer<typeof engineeringValueSchema>;

export const libraryEngineeringValueSchema = z.object({ key: z.string(), label: z.string(), value: z.union([z.number(), z.string(), z.boolean(), z.array(z.record(z.any())), z.array(z.any())]), valueType: valueTypeSchema, unit: z.string().optional(), status: dataStatusSchema, sourceReferences: z.array(sourceReferenceSchema), notes: z.string().optional() });
export type LibraryEngineeringValue = zInfer<typeof libraryEngineeringValueSchema>;

export const componentLibraryItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  componentType: z.string(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  description: z.string().optional(),
  approvedEngineeringValues: z.array(libraryEngineeringValueSchema),
  sourceReferences: z.array(sourceReferenceSchema),
  originatingProjectId: z.string().optional(),
  originatingComponentId: z.string().optional(),
  tags: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type ComponentLibraryItem = zInfer<typeof componentLibraryItemSchema>;

export const moduleTypeSchema = z.enum(['extraction','summary','comparison','calculation','checklist','report']);
export type ModuleType = zInfer<typeof moduleTypeSchema>;
export const moduleInputSchema = z.object({ key: z.string(), label: z.string(), description: z.string().optional(), valueType: valueTypeSchema, unit: z.string().optional(), required: z.boolean() });
export type ModuleInput = zInfer<typeof moduleInputSchema>;
export const moduleOutputSchema = moduleInputSchema;
export type ModuleOutput = zInfer<typeof moduleOutputSchema>;
export const engineeringModuleSchema = z.object({ id: z.string(), name: z.string(), description: z.string(), moduleType: moduleTypeSchema, applicableProjectTypes: z.array(z.string()), inputs: z.array(moduleInputSchema), outputs: z.array(moduleOutputSchema), validationRules: z.array(z.string()).optional(), calculationMethod: z.string().optional(), reportTemplate: z.string().optional() });
export type EngineeringModule = zInfer<typeof engineeringModuleSchema>;
export const moduleValueSchema = z.object({ key: z.string(), label: z.string(), value: z.union([z.number(), z.string(), z.boolean(), z.array(z.record(z.any())), z.array(z.any())]), valueType: valueTypeSchema, unit: z.string().optional() });
export type ModuleValue = zInfer<typeof moduleValueSchema>;
export const calculationResultSchema = z.object({ moduleId: z.string(), projectId: z.string(), inputsUsed: z.array(moduleValueSchema), outputs: z.array(moduleValueSchema), warnings: z.array(z.string()), assumptions: z.array(z.string()), createdAt: z.string() });
export type CalculationResult = zInfer<typeof calculationResultSchema>;
export const reportSectionSchema = z.object({ id: z.string(), projectId: z.string(), title: z.string(), bodyMarkdown: z.string(), sourceReferences: z.array(sourceReferenceSchema), status: dataStatusSchema, createdAt: z.string(), updatedAt: z.string() });
export type ReportSection = zInfer<typeof reportSectionSchema>;
