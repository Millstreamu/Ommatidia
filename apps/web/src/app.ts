import { ApiClient } from './apiClient.js';


export function resolveApiBaseUrl(_hostname: string): string {
  return '/api';
}

const STATUS_COLORS: Record<string, string> = {
  user_entered: '#1d4ed8',
  approved: '#166534',
  needs_review: '#b45309',
  ai_extracted: '#7c3aed',
  rejected: '#b91c1c',
  superseded: '#475569'
};

export function validateEngineeringValueForm(input: Record<string, string>): string[] {
  const required = ['key', 'label', 'value', 'valueType'];
  return required.filter((field) => !input[field]?.trim()).map((field) => `${field} is required`);
}

export function renderStatusBadge(status: string): string {
  const color = STATUS_COLORS[status] ?? '#334155';
  const emphasis = status === 'needs_review' || status === 'ai_extracted' ? 'font-weight:700;' : '';
  return `<span style="display:inline-block;padding:2px 8px;border-radius:999px;background:${color};color:white;font-size:12px;${emphasis}">${status}</span>`;
}

export function renderDocumentList(documents: Array<{ originalFilename: string; documentType: string; fileSizeBytes: number; uploadStatus: string; processingStatus: string; createdAt: string; id: string }>, apiBaseUrl: string): string {
  if (!documents.length) return '<p>No documents uploaded yet.</p>';
  return documents.map((d) => `<li><strong>${d.originalFilename}</strong> (${d.documentType}) • ${d.fileSizeBytes} bytes • uploaded ${new Date(d.createdAt).toLocaleString()}<br/>Status: ${d.uploadStatus}/${d.processingStatus} • <a href="${apiBaseUrl}/documents/${d.id}/file" target="_blank" rel="noreferrer">View</a></li>`).join('');
}

export function renderProjectsView(projects: Array<{ id: string; name: string; description?: string | null; createdAt: string }>, state: { loading?: boolean; error?: string } = {}): string {
  if (state.loading) return '<p>Loading projects…</p>';
  if (state.error) return `<p style="color:#b91c1c;">Could not load projects: ${state.error}</p>`;
  if (!projects.length) return '<p>No projects yet. Create your first project to get started.</p>';
  return `<ul style="list-style:none;padding:0;display:grid;gap:12px;">${projects.map((p) => `<li style="border:1px solid #cbd5e1;border-radius:8px;padding:12px;"><h3 style="margin:0 0 6px;">${p.name}</h3><p style="margin:0 0 6px;">${p.description ?? 'No description provided.'}</p><small>Created ${new Date(p.createdAt).toLocaleString()}</small><br/><a href="#/projects/${p.id}">Open project</a></li>`).join('')}</ul>`;
}
export async function submitCreateProject(
  client: ApiClient,
  input: { name: string; description?: string; projectType: string },
  setStatus: (value: string) => void,
  setBusy: (value: boolean) => void,
  onSuccess: () => Promise<void>
): Promise<void> {
  setBusy(true);
  setStatus('Creating...');
  try {
    await client.createProject(input);
    await onSuccess();
    setStatus('Created.');
  } catch (error) {
    setStatus(`Could not create project: ${(error as Error).message}`);
  } finally {
    setBusy(false);
  }
}

export async function triggerReportSectionsDocxExport(client: ApiClient, input: { projectId: string; reportSectionIds: string[]; documentTitle?: string; includeSourceReferences?: boolean }): Promise<string> {
  const blob = await client.exportReportSectionsDocx(input);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${(input.documentTitle || 'report-sections').replace(/\s+/g, '-')}.docx`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  return url;
}

export function mountApp(root: HTMLElement, apiBaseUrl: string): void {
  const client = new ApiClient(apiBaseUrl);
  root.innerHTML = `<header style="padding:16px;border-bottom:1px solid #cbd5e1;background:#f8fafc;"><h1 style="margin:0;">Engineering Design Assistant</h1><p style="margin:6px 0 0;color:#334155;">AI-assisted engineering drafts with deterministic calculations and review-first workflows.</p><nav id="top-nav" style="margin-top:10px;"></nav></header><main id="view" style="padding:16px;max-width:1100px;margin:auto;"></main>`;
  const view = root.querySelector('#view') as HTMLElement;
  const nav = root.querySelector('#top-nav') as HTMLElement;

  const load = async () => {
    const hash = window.location.hash;
    if (hash.startsWith('#/projects/')) {
      const projectId = hash.split('/')[2];
      const [project, components, values, modules, documents, reportSections, library] = await Promise.all([
        client.getProject(projectId),
        client.listComponents(projectId),
        client.listEngineeringValues(projectId),
        client.listModules(),
        client.listDocuments(projectId),
        client.listReportSections(projectId),
        client.listComponentLibrary()
      ]);
      nav.innerHTML = `<a href="#/" style="margin-right:12px;">Projects</a><strong>${project.name}</strong>`;
      const valuesByComponent = components.map((c) => ({ component: c, values: values.filter((v) => v.componentId === c.id) }));

      view.innerHTML = `<h2>${project.name}</h2>
      <section><h3>Project overview</h3><p>${project.description ?? 'No description provided.'}</p></section>
      <section><h3>Components</h3><ul>${components.map((c) => `<li>${c.name} (${c.type}) <button data-promote-component-id="${c.id}">Promote to library</button></li>`).join('')}</ul><form id="component-form"><input name="name" placeholder="Component name" required/><input name="type" placeholder="Component type" required/><button>Add component</button></form></section>
      <section><h3>Engineering values</h3><p>AI-extracted values need review before they are used in final reports. Approved and user-entered values are used by default.</p>${valuesByComponent.map(({ component, values: componentValues }) => `<h4>${component.name}</h4><ul>${componentValues.map((v) => `<li><strong>${v.label}</strong>: ${String(v.value)} ${v.unit ?? ''} ${renderStatusBadge(v.status)}<br/><small>Unit: ${v.unit ?? 'n/a'} • Source reference: stored in record metadata when available.</small><br/><button data-status-id="${v.id}" data-status="approved">Approve</button> <button data-status-id="${v.id}" data-status="rejected">Reject</button></li>`).join('')}</ul>`).join('')}<form id="value-form"><select name="componentId">${components.map((c) => `<option value="${c.id}">${c.name}</option>`)}</select><input name="key" placeholder="Key" required/><input name="label" placeholder="Label" required/><input name="value" placeholder="Value" required/><select name="valueType"><option>number</option><option>string</option><option>boolean</option></select><input name="unit" placeholder="Unit (optional)"/><select name="status"><option value="user_entered">user_entered</option><option value="needs_review">needs_review</option><option value="approved">approved</option><option value="ai_extracted">ai_extracted</option><option value="rejected">rejected</option><option value="superseded">superseded</option></select><button>Add value</button></form></section>
      <section><h3>Documents</h3><p>Supported upload file types: PDF, PNG, JPG, JPEG, WEBP.</p><form id="document-form"><input name="file" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" required/><select name="documentType"><option value="datasheet">datasheet</option><option value="manual">manual</option><option value="quote">quote</option><option value="schematic">schematic</option><option value="drawing">drawing</option><option value="other">other</option></select><button>Upload document</button></form><ul>${documents.map((d)=>`<li>${d.originalFilename} | ${d.documentType} | ${d.fileSizeBytes} bytes | ${d.uploadStatus}/${d.processingStatus} | <button data-extract-doc-id="${d.id}">Run extraction</button> <button data-retry-doc-id="${d.id}">Retry</button> <span id="extract-status-${d.id}"></span><ul id="extract-attempts-${d.id}"></ul></li>`).join('')}</ul></section>
      <section><h3>AI extraction</h3><p>Review extracted values carefully. Unapproved values remain visible until accepted or rejected.</p></section>
      <section><h3>Calculations</h3><p>Hydraulic power (kW). Enter flow in L/min, pressure in bar, and efficiency as decimal (0-1) or percent (>1).</p><form id="calc-form"><input name="flowLpm" placeholder="Flow (L/min)" required/><input name="pressureBar" placeholder="Pressure (bar)" required/><input name="efficiency" placeholder="Efficiency (0.85 or 85)" required/><button>Run calculation</button></form><pre id="calc-result"></pre></section>
      <section><h3>Report sections</h3><p>Reports are generated from saved report sections. These sections are editable drafts.</p><form id="report-generate-form"><select name="sectionType"><option value="component_summary">Component Summary</option><option value="calculation_summary">Calculation Summary</option><option value="assumptions_and_warnings">Assumptions and Warnings</option><option value="missing_information">Missing Information</option><option value="source_references">Source References</option></select><button>Generate section</button></form><div>${reportSections.map((section) => `<article><input data-report-title-id="${section.id}" value="${section.title}"/><textarea data-report-body-id="${section.id}" rows="6" cols="80">${section.bodyMarkdown}</textarea><button data-report-save-id="${section.id}">Save section</button></article>`).join('')}</div><h3>Word export</h3><p>Word export uses the current saved report sections.</p><button id="export-report-docx">Export Word document</button><span id="export-report-status"></span></section>
      <section><h3>Component library</h3><ul>${library.map((i) => `<li>${i.name} (${i.componentType}) [${i.approvedEngineeringValues.length}] <button data-library-copy-id="${i.id}">Copy to project</button> <button data-library-compare-id="${i.id}">Compare with first component</button></li>`).join('')}</ul><p>Available modules: ${modules.map((m) => m.name).join(', ')}</p></section>`;

      // existing handlers unchanged behavior
      (view.querySelector('#component-form') as HTMLFormElement).onsubmit = async (e) => { e.preventDefault(); const fd = new FormData(e.currentTarget as HTMLFormElement); await client.createComponent({ projectId, name: String(fd.get('name')), type: String(fd.get('type')) }); await load(); };
      (view.querySelector('#value-form') as HTMLFormElement).onsubmit = async (e) => { e.preventDefault(); const fd = new FormData(e.currentTarget as HTMLFormElement); const raw = Object.fromEntries(fd.entries()) as Record<string, string>; const errors = validateEngineeringValueForm(raw); if (errors.length) { alert(errors.join(', ')); return; } const parsedValue = raw.valueType === 'number' ? Number(raw.value) : raw.valueType === 'boolean' ? raw.value === 'true' : raw.value; await client.createEngineeringValue({ projectId, componentId: raw.componentId, key: raw.key, label: raw.label, value: parsedValue, valueType: raw.valueType, unit: raw.unit || undefined, status: raw.status || 'user_entered' }); await load(); };
      view.querySelectorAll<HTMLButtonElement>('button[data-extract-doc-id]').forEach((btn) => { btn.onclick = async () => { const statusEl = view.querySelector(`#extract-status-${btn.dataset.extractDocId!}`) as HTMLElement; statusEl.textContent = 'Extracting...'; try { const result = await client.extractValues({ projectId, documentId: btn.dataset.extractDocId! }); statusEl.textContent = `Success: extracted ${result.candidateValues.length} candidate value(s).`; await load(); } catch (error) { const err = error as Error & { extractionError?: { errorCode?: string; message?: string; retryable?: boolean } }; const code = err.extractionError?.errorCode; const msgMap: Record<string,string> = { missing_api_key:'Missing API key for extraction provider.', request_timeout:'Extraction timed out.', rate_limited:'Rate limit reached.', invalid_model_response:'Invalid AI response.', invalid_json_response:'AI returned malformed JSON.', file_not_found:'Document file was not found.', unsupported_file_type:'Unsupported file type.' }; const base = code ? (msgMap[code] ?? 'Extraction failed.') : (err.message || 'Extraction failed'); statusEl.textContent = `Error: ${base}${err.extractionError?.retryable ? ' You can retry.' : ''}`; } }; });
      for (const d of documents) { const attempts = await client.listExtractionAttempts(projectId, d.id); const el = view.querySelector(`#extract-attempts-${d.id}`) as HTMLElement | null; if (el) el.innerHTML = attempts.map((a) => `<li>${a.status} | ${a.valuesCreatedCount} values | ${a.errorCode ?? 'none'}</li>`).join(''); }
      view.querySelectorAll<HTMLButtonElement>('button[data-retry-doc-id]').forEach((btn) => { btn.onclick = () => { view.querySelector<HTMLButtonElement>(`button[data-extract-doc-id="${btn.dataset.retryDocId!}"]`)?.click(); }; });
      view.querySelectorAll<HTMLButtonElement>('button[data-status-id]').forEach((btn) => { btn.onclick = async () => { await client.updateEngineeringValueStatus(btn.dataset.statusId!, btn.dataset.status as 'approved' | 'rejected'); await load(); }; });
      (view.querySelector('#document-form') as HTMLFormElement).onsubmit = async (e) => { e.preventDefault(); const fd = new FormData(e.currentTarget as HTMLFormElement); const selectedFile = fd.get('file'); if (!(selectedFile instanceof File)) { alert('File is required'); return; } await client.uploadDocument(projectId, selectedFile, String(fd.get('documentType') || 'other')); await load(); };
      (view.querySelector('#report-generate-form') as HTMLFormElement).onsubmit = async (e) => { e.preventDefault(); const fd = new FormData(e.currentTarget as HTMLFormElement); await client.generateReportSection({ projectId, sectionType: String(fd.get('sectionType')) as any, engineeringValues: values }); await load(); };
      view.querySelectorAll<HTMLButtonElement>('button[data-report-save-id]').forEach((btn) => { btn.onclick = async () => { const id = btn.dataset.reportSaveId!; const title = (view.querySelector(`input[data-report-title-id="${id}"]`) as HTMLInputElement).value; const bodyMarkdown = (view.querySelector(`textarea[data-report-body-id="${id}"]`) as HTMLTextAreaElement).value; await client.updateReportSection(id, { title, bodyMarkdown, status: 'needs_review' }); await load(); }; });
      (view.querySelector('#export-report-docx') as HTMLButtonElement).onclick = async () => { const statusEl = view.querySelector('#export-report-status') as HTMLElement; statusEl.textContent = 'Exporting...'; try { await triggerReportSectionsDocxExport(client, { projectId, reportSectionIds: reportSections.map((section) => section.id), documentTitle: `${project.name} Report Sections`, includeSourceReferences: true }); statusEl.textContent = 'Success: download started.'; } catch (error) { statusEl.textContent = `Export failed: ${(error as Error).message}`; } };
      view.querySelectorAll<HTMLButtonElement>('button[data-promote-component-id]').forEach((btn) => { btn.onclick = async () => { await client.promoteComponentToLibrary({ projectId, componentId: btn.dataset.promoteComponentId! }); await load(); }; });
      view.querySelectorAll<HTMLButtonElement>('button[data-library-copy-id]').forEach((btn) => { btn.onclick = async () => { await client.copyLibraryToProject(btn.dataset.libraryCopyId!, { targetProjectId: projectId }); await load(); }; });
      view.querySelectorAll<HTMLButtonElement>('button[data-library-compare-id]').forEach((btn) => { btn.onclick = async () => { const firstComponent = components[0]; if (!firstComponent) { alert('Add a component first'); return; } const result = await client.compareLibraryWithComponent(btn.dataset.libraryCompareId!, { targetProjectId: projectId, targetComponentId: firstComponent.id }); alert(`Compare: matching=${result.matching.length}, differing=${result.differing.length}, missing=${result.missingInTarget.length}, extra=${result.extraInTarget.length}`); }; });
      (view.querySelector('#calc-form') as HTMLFormElement).onsubmit = async (e) => { e.preventDefault(); const fd = new FormData(e.currentTarget as HTMLFormElement); const result = await client.hydraulicPowerKw({ projectId, flowLpm: Number(fd.get('flowLpm')), pressureBar: Number(fd.get('pressureBar')), efficiency: Number(fd.get('efficiency')) }); (view.querySelector('#calc-result') as HTMLElement).textContent = `Formula: Hydraulic Power (kW)\nInputs: ${JSON.stringify(result.inputsUsed)}\nResult: ${JSON.stringify(result.outputs)}\nAssumptions: ${(result.assumptions ?? []).join('; ') || 'none'}\nWarnings: ${(result.warnings ?? []).join('; ') || 'none'}`; };
      return;
    }

    nav.innerHTML = '<strong>Projects</strong>';
    let projectsHtml = 'Loading projects…';
    view.innerHTML = `<h2>Projects</h2><small style="color:#475569;display:block;margin-bottom:8px;">API base URL: ${apiBaseUrl}</small><p>Create or open a project to start adding components, documents, calculations, and report sections.</p><div id="project-list">${projectsHtml}</div><h3>Create project</h3><form id="project-form"><input name="name" placeholder="Project name" required/><input name="description" placeholder="Description"/><input name="projectType" placeholder="Project type" value="custom" required/><button>Create project</button><span id="project-status"></span></form>`;
    const listEl = view.querySelector('#project-list') as HTMLElement;
    try {
      listEl.innerHTML = renderProjectsView(await client.listProjects());
    } catch (error) {
      listEl.innerHTML = renderProjectsView([], { error: (error as Error).message });
    }
    (view.querySelector('#project-form') as HTMLFormElement).onsubmit = async (e) => {
      e.preventDefault();
      const statusEl = view.querySelector('#project-status') as HTMLElement;
      const submitBtn = (e.currentTarget as HTMLFormElement).querySelector('button') as HTMLButtonElement;
      const fd = new FormData(e.currentTarget as HTMLFormElement);
      await submitCreateProject(client, { name: String(fd.get('name')), description: String(fd.get('description') || ''), projectType: String(fd.get('projectType')) }, (v) => { statusEl.textContent = v; }, (busy) => { submitBtn.disabled = busy; }, async () => {
        listEl.innerHTML = renderProjectsView(await client.listProjects());
      });
    };
  };

  window.addEventListener('hashchange', () => { void load(); });
  void load();
}

export async function renderComponentLibrary(client: ApiClient): Promise<string> { const items = await client.listComponentLibrary(); return items.map((i) => `<li>${i.name} (${i.componentType}) [${i.approvedEngineeringValues.length} values] <button data-library-copy-id="${i.id}">Copy to project</button></li>`).join(''); }
