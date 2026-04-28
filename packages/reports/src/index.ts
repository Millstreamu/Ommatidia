export interface ReportRequest {
  id: string;
  format: 'markdown' | 'pdf';
}

export function createReportRequest(id: string, format: ReportRequest['format']): ReportRequest {
  return { id, format };
}
