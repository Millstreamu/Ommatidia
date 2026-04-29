export function getApiBaseUrlForDebug(baseUrl: string): string { return baseUrl; }

export interface Project { id: string; name: string; description?: string; projectType: string; createdAt: string; updatedAt: string; }
export interface Component { id: string; projectId: string; name: string; type: string; description?: string; createdAt: string; updatedAt: string; }
export interface EngineeringValue { id: string; projectId: string; componentId?: string; key: string; label: string; value: number | string | boolean; valueType: string; unit?: string; status: string; createdAt: string; updatedAt: string; }
export interface EngineeringModule { id: string; name: string; description: string; moduleType: string; }
export interface DocumentRecord { id: string; projectId: string; originalFilename: string; storedFilename: string; mimeType: string; fileSizeBytes: number; documentType: string; uploadStatus: string; processingStatus: string; createdAt: string; updatedAt: string; }
export interface SystemStatus { ok: boolean; extractionProvider: 'openai' | 'mock' | 'unknown'; openAiConfigured: boolean; openAiModel?: string; apiProxyMode: boolean; timestamp: string; }

export interface HydraulicPowerResponse { moduleId: string; projectId: string; inputsUsed: Array<{ key: string; label: string; value: number | string | boolean; valueType: string; unit?: string }>; outputs: Array<{ key: string; label: string; value: number | string | boolean; valueType: string; unit?: string }>; warnings: string[]; assumptions: string[]; createdAt: string; }


function toHelpfulNetworkError(error: unknown): Error {
  const message = (error as Error)?.message ?? '';
  if (message.includes('Failed to fetch') || message.includes('NetworkError') || message.includes('fetch')) {
    return new Error('Could not reach the API. Check that the web server is running on port 3000 and API proxy /api is reachable.');
  }
  return error instanceof Error ? error : new Error('Unknown network error');
}

export class ApiClient {
  constructor(private readonly baseUrl: string) {}
  private async request<T>(path: string, init?: RequestInit): Promise<T> { let response: Response; try { response = await fetch(`${this.baseUrl}${path}`, { ...init, headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) } }); } catch (error) { throw toHelpfulNetworkError(error); } if (!response.ok) { let body: any = undefined; try { body = await response.json(); } catch {} const err = new Error(body?.message ?? `API request failed (${response.status})`) as Error & { extractionError?: ExtractionErrorResponse }; if (body?.errorCode) err.extractionError = body as ExtractionErrorResponse; throw err; } return response.json() as Promise<T>; }
  listProjects() { return this.request<Project[]>('/projects'); }
  getSystemStatus() { return this.request<SystemStatus>('/system/status'); }
  updateExtractionProvider(extractionProvider: 'mock' | 'openai') { return this.request<SystemStatus>('/system/extraction-provider', { method: 'PATCH', body: JSON.stringify({ extractionProvider }) }); }
  createProject(input: { name: string; description?: string; projectType: string }) { return this.request<Project>('/projects', { method: 'POST', body: JSON.stringify(input) }); }
  getProject(projectId: string) { return this.request<Project>(`/projects/${projectId}`); }
  listComponents(projectId: string) { return this.request<Component[]>(`/components?projectId=${projectId}`); }
  createComponent(input: { projectId: string; name: string; type: string; description?: string }) { return this.request<Component>('/components', { method: 'POST', body: JSON.stringify(input) }); }
  listEngineeringValues(projectId: string) { return this.request<EngineeringValue[]>(`/engineering-values?projectId=${projectId}`); }
  createEngineeringValue(input: { projectId: string; componentId?: string; key: string; label: string; value: number | string | boolean; valueType: string; unit?: string; status: string }) { return this.request<EngineeringValue>('/engineering-values', { method: 'POST', body: JSON.stringify({ ...input, sourceReferences: [] }) }); }
  updateEngineeringValueStatus(valueId: string, status: 'approved' | 'rejected') { return this.request<EngineeringValue>(`/engineering-values/${valueId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }); }
  listModules() { return this.request<EngineeringModule[]>('/engineering-modules'); }
  listDocuments(projectId: string) { return this.request<DocumentRecord[]>(`/documents?projectId=${projectId}`); }
  async uploadDocument(projectId: string, file: File, documentType: string) {
    const response = await fetch(`${this.baseUrl}/projects/${projectId}/documents`, { method: 'POST', body: file, headers: { 'content-type': file.type, 'x-document-type': documentType, 'x-filename': file.name } });
    if (!response.ok) throw new Error(`API request failed (${response.status}): ${await response.text()}`);
    return response.json() as Promise<DocumentRecord>;
  }
  hydraulicPowerKw(input: { projectId: string; flowLpm: number; pressureBar: number; efficiency: number }) { return this.request<HydraulicPowerResponse>('/calculations/hydraulic-power-kw', { method: 'POST', body: JSON.stringify(input) }); }
  extractValues(input: { projectId: string; documentId: string; extractionTarget?: { componentType?: string; moduleType?: string } }) { return this.request<ExtractionResult>('/extractions', { method: 'POST', body: JSON.stringify(input) }); }
  listExtractionAttempts(projectId: string, documentId: string) { return this.request<ExtractionAttempt[]>(`/extractions/attempts?projectId=${projectId}&documentId=${documentId}`); }
  generateReportSection(input: { projectId: string; componentId?: string; sectionType: 'component_summary' | 'calculation_summary' | 'assumptions_and_warnings' | 'missing_information' | 'source_references'; engineeringValues: EngineeringValue[]; missingInformation?: string[]; assumptions?: string[]; warnings?: string[] }) { return this.request<ReportSection>('/report-sections/generate', { method: 'POST', body: JSON.stringify(input) }); }
  listReportSections(projectId: string) { return this.request<ReportSection[]>(`/report-sections?projectId=${projectId}`); }
  updateReportSection(id: string, input: { title?: string; bodyMarkdown?: string; status?: string }) { return this.request<ReportSection>(`/report-sections/${id}`, { method: 'PATCH', body: JSON.stringify(input) }); }

  listComponentLibrary(q?: string) { return this.request<ComponentLibraryItem[]>(`/component-library${q ? `?q=${encodeURIComponent(q)}` : ''}`); }
  promoteComponentToLibrary(input: { projectId: string; componentId: string; name?: string; tags?: string[] }) { return this.request<ComponentLibraryItem>('/component-library/promote', { method: 'POST', body: JSON.stringify(input) }); }
  copyLibraryToProject(libraryId: string, input: { targetProjectId: string; componentName?: string }) { return this.request<{ component: Component; engineeringValues: EngineeringValue[] }>(`/component-library/${libraryId}/copy-to-project`, { method: 'POST', body: JSON.stringify(input) }); }
  compareLibraryWithComponent(libraryId: string, input: { targetProjectId: string; targetComponentId: string }) { return this.request<{ matching: unknown[]; differing: unknown[]; missingInTarget: unknown[]; extraInTarget: unknown[] }>(`/component-library/${libraryId}/compare`, { method: 'POST', body: JSON.stringify(input) }); }

  async exportReportSectionsDocx(input: { projectId: string; reportSectionIds: string[]; documentTitle?: string; includeSourceReferences?: boolean }) {
    const response = await fetch(`${this.baseUrl}/report-sections/export-docx`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) });
    if (!response.ok) throw new Error(`API request failed (${response.status})`);
    return response.blob();
  }
}


export interface ExtractionErrorResponse { errorCode: string; message: string; retryable: boolean; userAction?: string; details?: Record<string, unknown>; timestamp: string }
export interface ExtractionResult { candidateValues: EngineeringValue[]; missingInformation: string[]; warnings: string[]; providerMetadata?: { provider: string; model?: string }; valuesCreatedCount?: number; diagnostics?: Record<string, unknown> }
export interface ExtractionAttempt { id: string; projectId: string; documentId: string; provider: string; status: 'pending'|'succeeded'|'failed'; startedAt: string; completedAt?: string; errorCode?: string; safeErrorMessage?: string; valuesCreatedCount: number; warnings?: string[]; diagnostics?: Record<string, unknown> }
export interface ReportSection { id: string; projectId: string; title: string; bodyMarkdown: string; sourceReferences: Array<{ documentId: string; pageNumber?: number; sectionTitle?: string; sourceText?: string }>; status: string; createdAt: string; updatedAt: string; }

export interface LibraryEngineeringValue { key:string; label:string; value:number|string|boolean; valueType:string; unit?:string; status:string; notes?:string; sourceReferences:Array<{documentId:string; pageNumber?:number; sectionTitle?:string; sourceText?:string}> }
export interface ComponentLibraryItem { id:string; name:string; componentType:string; description?:string; approvedEngineeringValues:LibraryEngineeringValue[]; tags:string[]; createdAt:string; updatedAt:string }
