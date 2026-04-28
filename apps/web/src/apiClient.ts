export interface Project { id: string; name: string; description?: string; projectType: string; createdAt: string; updatedAt: string; }
export interface Component { id: string; projectId: string; name: string; type: string; description?: string; createdAt: string; updatedAt: string; }
export interface EngineeringValue { id: string; projectId: string; componentId?: string; key: string; label: string; value: number | string | boolean; valueType: string; unit?: string; status: string; createdAt: string; updatedAt: string; }
export interface EngineeringModule { id: string; name: string; description: string; moduleType: string; }

export interface HydraulicPowerResponse {
  moduleId: string;
  projectId: string;
  inputsUsed: Array<{ key: string; label: string; value: number | string | boolean; valueType: string; unit?: string }>;
  outputs: Array<{ key: string; label: string; value: number | string | boolean; valueType: string; unit?: string }>;
  warnings: string[];
  assumptions: string[];
  createdAt: string;
}

export class ApiClient {
  constructor(private readonly baseUrl: string) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) }
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`API request failed (${response.status}): ${body}`);
    }
    return response.json() as Promise<T>;
  }

  listProjects() { return this.request<Project[]>('/projects'); }
  createProject(input: { name: string; description?: string; projectType: string }) { return this.request<Project>('/projects', { method: 'POST', body: JSON.stringify(input) }); }
  getProject(projectId: string) { return this.request<Project>(`/projects/${projectId}`); }
  listComponents(projectId: string) { return this.request<Component[]>(`/components?projectId=${projectId}`); }
  createComponent(input: { projectId: string; name: string; type: string; description?: string }) { return this.request<Component>('/components', { method: 'POST', body: JSON.stringify(input) }); }
  listEngineeringValues(projectId: string) { return this.request<EngineeringValue[]>(`/engineering-values?projectId=${projectId}`); }
  createEngineeringValue(input: { projectId: string; componentId?: string; key: string; label: string; value: number | string | boolean; valueType: string; unit?: string; status: string }) {
    return this.request<EngineeringValue>('/engineering-values', { method: 'POST', body: JSON.stringify({ ...input, sourceReferences: [] }) });
  }
  updateEngineeringValueStatus(valueId: string, status: 'approved' | 'rejected') {
    return this.request<EngineeringValue>(`/engineering-values/${valueId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
  }
  listModules() { return this.request<EngineeringModule[]>('/engineering-modules'); }
  hydraulicPowerKw(input: { projectId: string; flowLpm: number; pressureBar: number; efficiency: number }) {
    return this.request<HydraulicPowerResponse>('/calculations/hydraulic-power-kw', { method: 'POST', body: JSON.stringify(input) });
  }
}
