export interface ExtractionJob {
  id: string;
  sourceType: 'pdf' | 'cad' | 'spreadsheet' | 'other';
}

export function createExtractionJob(id: string, sourceType: ExtractionJob['sourceType']): ExtractionJob {
  return { id, sourceType };
}
