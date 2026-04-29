import { ApiClient, type SystemStatus } from './apiClient.js';


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

export function renderOpenAiStatusBadge(status?: SystemStatus, unavailable = false): string {
  const tooltip = 'This only checks server configuration. It does not display or test the key.';
  if (unavailable || !status) return `<span title="${tooltip}" style="display:inline-block;padding:4px 10px;border-radius:999px;background:#fee2e2;color:#991b1b;font-size:12px;font-weight:600;">Status unavailable</span>`;
  if (status.extractionProvider === 'mock') return `<span title="${tooltip}" style="display:inline-block;padding:4px 10px;border-radius:999px;background:#e2e8f0;color:#334155;font-size:12px;font-weight:600;">Extraction: mock mode</span>`;
  if (status.extractionProvider === 'openai' && status.openAiConfigured) return `<span title="${tooltip}" style="display:inline-block;padding:4px 10px;border-radius:999px;background:#dcfce7;color:#166534;font-size:12px;font-weight:600;">OpenAI: connected</span>`;
  return `<span title="${tooltip}" style="display:inline-block;padding:4px 10px;border-radius:999px;background:#fee2e2;color:#991b1b;font-size:12px;font-weight:600;">OpenAI: key missing</span>`;
}
export function renderExtractionProviderControls(status?: SystemStatus): string {
  if (!status) return '';
  const modeLabel = status.extractionProvider === 'openai' ? 'Extraction: OpenAI' : 'Extraction: mock';
  const keyLabel = status.openAiConfigured ? `OpenAI key configured • model ${status.openAiModel ?? 'unknown'}` : `OpenAI key missing • model ${status.openAiModel ?? 'unknown'}`;
  const openAiDisabled = status.openAiConfigured ? '' : 'disabled';
  const note = status.extractionProvider === 'openai' ? '<p style="margin:8px 0 0;color:#92400e;font-weight:600;">Real OpenAI extraction may use API credits.</p>' : '';
  return `<div style="margin-top:8px;padding:8px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;">
    <div style="font-size:13px;font-weight:600;">${modeLabel}</div>
    <div style="font-size:12px;color:#334155;margin:4px 0 8px;">${keyLabel}</div>
    <label>Provider:
      <select id="extraction-provider-select">
        <option value="mock" ${status.extractionProvider === 'mock' ? 'selected' : ''}>Mock</option>
        <option value="openai" ${status.extractionProvider === 'openai' ? 'selected' : ''} ${openAiDisabled}>OpenAI</option>
      </select>
    </label>
    <div style="margin-top:8px;display:flex;gap:8px;align-items:center;"><button id="openai-smoke-test-btn" type="button">Test OpenAI</button><span style="font-size:12px;color:#334155;">Small connectivity/configuration test only (not document extraction).</span></div>
    <div id="openai-smoke-test-status" style="font-size:12px;margin-top:6px;color:#334155;"></div>
    <div id="extraction-provider-error" style="color:#b91c1c;font-size:12px;margin-top:6px;"></div>
    ${note}
  </div>`;
}




export function renderDroppedCandidateWarnings(attempt: { diagnostics?: Record<string, unknown> }): string {
  const dropped = Array.isArray((attempt.diagnostics as { droppedCandidates?: unknown[] } | undefined)?.droppedCandidates)
    ? ((attempt.diagnostics as { droppedCandidates?: Array<{ candidateIdentifier?: string; reasonCode?: string; validationIssueMessages?: string[] }> }).droppedCandidates ?? [])
    : [];
  if (!dropped.length) return '';
  return dropped.map((item) => {
    const id = item.candidateIdentifier ? `‘${item.candidateIdentifier}’` : 'candidate';
    const detail = item.validationIssueMessages?.[0] ?? item.reasonCode ?? 'failed schema validation';
    return `Dropped ${id}: ${detail}.`;
  }).join(' | ');
}
export function renderExtractionDiagnostics(attempt: { diagnostics?: Record<string, unknown>; warnings?: string[] }): string {
  const diagnostics = (attempt.diagnostics ?? {}) as Record<string, unknown>;
  const pdf = (diagnostics.pdfTextExtraction ?? {}) as Record<string, unknown>;
  const extracted = Number(pdf.extractedCharacterCount ?? 0);
  const useful = Number(pdf.usefulTextCharacterCount ?? 0);
  const called = diagnostics.contentSentToModel === true ? 'yes' : 'no';
  const fallback = (diagnostics.openAiFallback ?? {}) as Record<string, unknown>;
  const fallbackCalled = fallback.called === true ? 'yes' : 'no';
  const suspiciousRatio = Number(pdf.suspiciousInternalTextRatio ?? 0);
  const warning = Array.isArray(attempt.warnings) ? attempt.warnings.find((w) => /did not produce useful visible text/i.test(w)) : undefined;
  if (!extracted && !useful && !warning) return '';
  return `Text extracted useful: ${useful > 20 ? 'yes' : 'no'} • chars: ${extracted} • useful chars: ${useful} • suspicious/internal ratio: ${suspiciousRatio.toFixed(2)} • OpenAI text called: ${called} • OpenAI file/vision fallback called: ${fallbackCalled}${warning ? ` • warning: ${warning}` : ''}`;
}
export function formatExtractionFailure(err: Error & { extractionError?: { errorCode?: string; message?: string; retryable?: boolean; userAction?: string; details?: Record<string, unknown> } }): string {
  const extractionError = err.extractionError;
  if (!extractionError) return `Error: ${err.message || 'Extraction failed.'}`;
  const code = extractionError.errorCode ?? 'unknown_error';
  const retryableText = extractionError.retryable === undefined ? '' : ` Retryable: ${extractionError.retryable ? 'yes' : 'no'}.`;
  const actionText = extractionError.userAction ? ` Action: ${extractionError.userAction}.` : '';
  const safeProviderMessage = typeof extractionError.details?.safeProviderMessage === 'string' ? ` Provider: ${extractionError.details.safeProviderMessage}.` : '';
  return `OpenAI extraction failed [${code}]: ${extractionError.message ?? 'Extraction failed.'}.${retryableText}${actionText}${safeProviderMessage}`.replace(/\.\./g, '.');
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
  root.innerHTML = `<header style="padding:16px;border-bottom:1px solid #cbd5e1;background:#f8fafc;display:flex;justify-content:space-between;align-items:flex-start;gap:12px;"><div><h1 style="margin:0;">Engineering Design Assistant</h1><p style="margin:6px 0 0;color:#334155;">AI-assisted engineering drafts with deterministic calculations and review-first workflows.</p><nav id="top-nav" style="margin-top:10px;"></nav></div><div id="system-status"></div></header><main id="view" style="padding:16px;max-width:1100px;margin:auto;"></main>`;
  const view = root.querySelector('#view') as HTMLElement;
  const nav = root.querySelector('#top-nav') as HTMLElement;
  const statusContainer = root.querySelector('#system-status') as HTMLElement;
  let latestSystemStatus: SystemStatus | undefined;
  const refreshSystemStatus = async () => {
    try {
      latestSystemStatus = await client.getSystemStatus();
      statusContainer.innerHTML = `${renderOpenAiStatusBadge(latestSystemStatus)}${renderExtractionProviderControls(latestSystemStatus)}`;
      const select = statusContainer.querySelector('#extraction-provider-select') as HTMLSelectElement | null;
      const errorEl = statusContainer.querySelector('#extraction-provider-error') as HTMLElement | null;
      if (select) {
        select.onchange = async () => {
          const previous = latestSystemStatus?.extractionProvider ?? 'mock';
          const next = select.value as 'mock' | 'openai';
          if (errorEl) errorEl.textContent = '';
          try {
            latestSystemStatus = await client.updateExtractionProvider(next);
            await refreshSystemStatus();
          } catch (error) {
            select.value = previous;
            if (errorEl) errorEl.textContent = `Could not switch provider: ${(error as Error).message}`;
          }
        };
      }
      const smokeBtn = statusContainer.querySelector('#openai-smoke-test-btn') as HTMLButtonElement | null;
      const smokeStatus = statusContainer.querySelector('#openai-smoke-test-status') as HTMLElement | null;
      if (smokeBtn) {
        smokeBtn.onclick = async () => {
          if (smokeStatus) smokeStatus.textContent = 'Testing OpenAI...';
          try {
            const result = await client.testOpenAi();
            if (smokeStatus) smokeStatus.textContent = result.ok ? 'OpenAI test succeeded' : `OpenAI test failed: ${result.message}`;
          } catch (error) {
            if (smokeStatus) smokeStatus.textContent = `OpenAI test failed: ${(error as Error).message}`;
          }
        };
      }
    } catch (error) {
      console.warn('System status check failed', { message: (error as Error).message });
      statusContainer.innerHTML = renderOpenAiStatusBadge(undefined, true);
    }
  };

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
      <section><h3>Engineering values</h3><p>AI-extracted values need review before they are used in final reports. Approved and user-entered values are used by default.</p>${valuesByComponent.map(({ component, values: componentValues }) => `<h4>${component.name}</h4><ul>${componentValues.map((v) => `<li><strong>${v.label}</strong>: ${String(v.value)} ${v.unit ?? ''} ${renderStatusBadge(v.status)}<br/><small>Unit: ${v.unit ?? 'n/a'} • Source reference: stored in record metadata when available.</small><br/><button data-status-id="${v.id}" data-status="approved">Approve</button> <button data-status-id="${v.id}" data-status="rejected">Reject</button></li>`).join('')}</ul>`).join('')}<h4>Unassigned extracted values</h4><ul>${values.filter((v)=>!v.componentId).map((v)=>`<li><strong>${v.label}</strong>: ${String(v.value)} ${v.unit ?? ''} ${renderStatusBadge(v.status)}</li>`).join('') || '<li>None</li>'}</ul><form id="value-form"><select name="componentId">${components.map((c) => `<option value="${c.id}">${c.name}</option>`)}</select><input name="key" placeholder="Key" required/><input name="label" placeholder="Label" required/><input name="value" placeholder="Value" required/><select name="valueType"><option>number</option><option>string</option><option>boolean</option></select><input name="unit" placeholder="Unit (optional)"/><select name="status"><option value="user_entered">user_entered</option><option value="needs_review">needs_review</option><option value="approved">approved</option><option value="ai_extracted">ai_extracted</option><option value="rejected">rejected</option><option value="superseded">superseded</option></select><button>Add value</button></form></section>
      <section><h3>Documents</h3><p>Supported upload file types: PDF, PNG, JPG, JPEG, WEBP.</p><form id="document-form"><input name="file" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" required/><select name="documentType"><option value="datasheet">datasheet</option><option value="manual">manual</option><option value="quote">quote</option><option value="schematic">schematic</option><option value="drawing">drawing</option><option value="other">other</option></select><button>Upload document</button></form><ul>${documents.map((d)=>`<li>${d.originalFilename} | ${d.documentType} | ${d.fileSizeBytes} bytes | ${d.uploadStatus}/${d.processingStatus} | <button data-extract-doc-id="${d.id}">Run extraction</button> <button data-retry-doc-id="${d.id}">Retry</button> <span id="extract-status-${d.id}"></span><ul id="extract-attempts-${d.id}"></ul></li>`).join('')}</ul></section>
      <section><h3>AI extraction</h3><p>Review extracted values carefully. Unapproved values remain visible until accepted or rejected.</p></section>
      <section><h3>Calculations</h3><p>Hydraulic power (kW). Enter flow in L/min, pressure in bar, and efficiency as decimal (0-1) or percent (>1).</p><form id="calc-form"><input name="flowLpm" placeholder="Flow (L/min)" required/><input name="pressureBar" placeholder="Pressure (bar)" required/><input name="efficiency" placeholder="Efficiency (0.85 or 85)" required/><button>Run calculation</button></form><pre id="calc-result"></pre></section>
      <section><h3>Report sections</h3><p>Reports are generated from saved report sections. These sections are editable drafts.</p><form id="report-generate-form"><select name="sectionType"><option value="component_summary">Component Summary</option><option value="calculation_summary">Calculation Summary</option><option value="assumptions_and_warnings">Assumptions and Warnings</option><option value="missing_information">Missing Information</option><option value="source_references">Source References</option></select><button>Generate section</button></form><div>${reportSections.map((section) => `<article><input data-report-title-id="${section.id}" value="${section.title}"/><textarea data-report-body-id="${section.id}" rows="6" cols="80">${section.bodyMarkdown}</textarea><button data-report-save-id="${section.id}">Save section</button></article>`).join('')}</div><h3>Word export</h3><p>Word export uses the current saved report sections.</p><button id="export-report-docx">Export Word document</button><span id="export-report-status"></span></section>
      <section><h3>Component library</h3><ul>${library.map((i) => `<li>${i.name} (${i.componentType}) [${i.approvedEngineeringValues.length}] <button data-library-copy-id="${i.id}">Copy to project</button> <button data-library-compare-id="${i.id}">Compare with first component</button></li>`).join('')}</ul><p>Available modules: ${modules.map((m) => m.name).join(', ')}</p></section>`;

      // existing handlers unchanged behavior
      (view.querySelector('#component-form') as HTMLFormElement).onsubmit = async (e) => { e.preventDefault(); const fd = new FormData(e.currentTarget as HTMLFormElement); await client.createComponent({ projectId, name: String(fd.get('name')), type: String(fd.get('type')) }); await load(); };
      (view.querySelector('#value-form') as HTMLFormElement).onsubmit = async (e) => { e.preventDefault(); const fd = new FormData(e.currentTarget as HTMLFormElement); const raw = Object.fromEntries(fd.entries()) as Record<string, string>; const errors = validateEngineeringValueForm(raw); if (errors.length) { alert(errors.join(', ')); return; } const parsedValue = raw.valueType === 'number' ? Number(raw.value) : raw.valueType === 'boolean' ? raw.value === 'true' : raw.value; await client.createEngineeringValue({ projectId, componentId: raw.componentId, key: raw.key, label: raw.label, value: parsedValue, valueType: raw.valueType, unit: raw.unit || undefined, status: raw.status || 'user_entered' }); await load(); };
      view.querySelectorAll<HTMLButtonElement>('button[data-extract-doc-id]').forEach((btn) => { btn.onclick = async () => { const statusEl = view.querySelector(`#extract-status-${btn.dataset.extractDocId!}`) as HTMLElement; statusEl.textContent = 'Extracting...'; try { const result = await client.extractValues({ projectId, documentId: btn.dataset.extractDocId! }); const keys = Array.isArray((result as any).createdCandidateKeys) ? (result as any).createdCandidateKeys.join(', ') : ''; statusEl.textContent = `Success: provider ${result.providerMetadata?.provider ?? 'unknown'} | created ${result.valuesCreatedCount ?? 0} value(s)${keys ? ` — ${keys}` : ''}. ${result.warnings?.[0] ?? ''}`; await load(); } catch (error) { const err = error as Error & { extractionError?: { errorCode?: string; message?: string; retryable?: boolean; userAction?: string; details?: Record<string, unknown> } }; statusEl.textContent = formatExtractionFailure(err); } }; });
      for (const d of documents) { const attempts = await client.listExtractionAttempts(projectId, d.id); const el = view.querySelector(`#extract-attempts-${d.id}`) as HTMLElement | null; if (el) el.innerHTML = attempts.map((a) => { const droppedSummary = renderDroppedCandidateWarnings(a); const diag = renderExtractionDiagnostics(a); const preview = typeof (a.diagnostics as Record<string, unknown> | undefined)?.pdfTextPreview === 'string' ? String((a.diagnostics as Record<string, unknown>).pdfTextPreview) : ''; const createdKeys = Array.isArray((a as any).createdCandidateKeys) ? (a as any).createdCandidateKeys.join(', ') : Array.isArray((a.diagnostics as any)?.createdCandidateKeys) ? (a.diagnostics as any).createdCandidateKeys.join(', ') : ''; return `<li><strong>${a.status}</strong> | provider: ${a.provider} | created: ${a.valuesCreatedCount}${createdKeys ? ` — ${createdKeys}` : ''}${a.valuesCreatedCount===0?' (zero values)':''} | ${a.errorCode ?? 'no error'}${a.warnings?.length?`<br/><span style="color:#92400e;">${a.warnings.join(' | ')}</span>`:''}${diag?`<br/><span style="color:#334155;">${diag}</span>`:''}${preview?`<details><summary>Text preview sent to OpenAI</summary><pre style="white-space:pre-wrap;max-height:180px;overflow:auto;">${preview}</pre></details>`:''}${droppedSummary?`<br/><span style="color:#92400e;">${droppedSummary}</span>`:''}${a.safeErrorMessage?`<br/><span style="color:#b91c1c;">${a.safeErrorMessage}</span>`:''}</li>`; }).join(''); }
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
  void refreshSystemStatus();
  void load();
}

export async function renderComponentLibrary(client: ApiClient): Promise<string> { const items = await client.listComponentLibrary(); return items.map((i) => `<li>${i.name} (${i.componentType}) [${i.approvedEngineeringValues.length} values] <button data-library-copy-id="${i.id}">Copy to project</button></li>`).join(''); }
