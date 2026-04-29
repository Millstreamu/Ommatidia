import { ApiClient } from './apiClient.js';

export function validateEngineeringValueForm(input: Record<string, string>): string[] {
  const required = ['key', 'label', 'value', 'valueType'];
  return required.filter((field) => !input[field]?.trim()).map((field) => `${field} is required`);
}

export function renderDocumentList(documents: Array<{ originalFilename: string; documentType: string; fileSizeBytes: number; uploadStatus: string; processingStatus: string; createdAt: string; id: string }>, apiBaseUrl: string): string {
  return documents.map((d) => `<li>${d.originalFilename} | ${d.documentType} | ${d.fileSizeBytes} bytes | ${d.uploadStatus}/${d.processingStatus} | ${new Date(d.createdAt).toISOString()} | <a href="${apiBaseUrl}/documents/${d.id}/file" target="_blank" rel="noreferrer">View</a></li>`).join('');
}

export async function renderProjectList(client: ApiClient): Promise<string> {
  const projects = await client.listProjects();
  return projects.map((p) => `<li><a href="#/projects/${p.id}">${p.name}</a> — ${p.description ?? ''} (${new Date(p.createdAt).toISOString()})</li>`).join('');
}

export function mountApp(root: HTMLElement, apiBaseUrl: string): void {
  const client = new ApiClient(apiBaseUrl);
  root.innerHTML = `<h1>Engineering Design Assistant</h1><div id="view"></div>`;
  const view = root.querySelector('#view') as HTMLElement;

  const load = async () => {
    const hash = window.location.hash;
    if (hash.startsWith('#/projects/')) {
      const projectId = hash.split('/')[2];
      const [project, components, values, modules, documents] = await Promise.all([
        client.getProject(projectId),
        client.listComponents(projectId),
        client.listEngineeringValues(projectId),
        client.listModules(),
        client.listDocuments(projectId)
      ]);
      const valuesByComponent = components.map((c) => ({ component: c, values: values.filter((v) => v.componentId === c.id) }));
      view.innerHTML = `
        <h2>${project.name}</h2>
        <p>${project.description ?? ''}</p>
        <h3>Components</h3>
        <ul>${components.map((c) => `<li>${c.name} (${c.type})</li>`).join('')}</ul>
        <form id="component-form"><input name="name" placeholder="Component name" required/><input name="type" placeholder="Type" required/><button>Add component</button></form>
        <h3>Engineering values</h3>
        ${valuesByComponent.map(({ component, values: componentValues }) => `<h4>${component.name}</h4><ul>${componentValues.map((v) => `<li>${v.label}: ${String(v.value)} ${v.unit ?? ''} [${v.status}] <button data-status-id="${v.id}" data-status="approved">Approve</button> <button data-status-id="${v.id}" data-status="rejected">Reject</button></li>`).join('')}</ul>`).join('')}
        <form id="value-form">
          <select name="componentId">${components.map((c) => `<option value="${c.id}">${c.name}</option>`)}</select>
          <input name="key" placeholder="key" required/><input name="label" placeholder="label" required/>
          <input name="value" placeholder="value" required/><select name="valueType"><option>number</option><option>string</option><option>boolean</option></select>
          <input name="unit" placeholder="unit (optional)"/><select name="status"><option value="user_entered">user_entered</option><option value="needs_review">needs_review</option><option value="approved">approved</option><option value="rejected">rejected</option></select>
          <button>Add value</button>
        </form>
        <h3>Engineering modules</h3>
        <ul>${modules.map((m) => `<li>${m.name} (${m.moduleType})</li>`).join('')}</ul>
        
        <h3>Documents</h3>
        <form id="document-form">
          <input name="file" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" required/>
          <select name="documentType"><option value="datasheet">datasheet</option><option value="manual">manual</option><option value="quote">quote</option><option value="schematic">schematic</option><option value="drawing">drawing</option><option value="other">other</option></select>
          <button>Upload document</button>
        </form>
        <ul>${documents.map((d)=>`<li>${d.originalFilename} | ${d.documentType} | ${d.fileSizeBytes} bytes | ${d.uploadStatus}/${d.processingStatus} | ${new Date(d.createdAt).toISOString()} | <a href="${apiBaseUrl}/documents/${d.id}/file" target="_blank" rel="noreferrer">View</a> <button data-extract-doc-id="${d.id}">Extract values</button> <span id="extract-status-${d.id}"></span></li>`).join('')}</ul>

        <h3>Hydraulic Power</h3>
        <form id="calc-form"><input name="flowLpm" placeholder="flowLpm" required/><input name="pressureBar" placeholder="pressureBar" required/><input name="efficiency" placeholder="efficiency" required/><button>Run</button></form>
        <pre id="calc-result"></pre>
      `;

      (view.querySelector('#component-form') as HTMLFormElement).onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget as HTMLFormElement);
        await client.createComponent({ projectId, name: String(fd.get('name')), type: String(fd.get('type')) });
        await load();
      };

      (view.querySelector('#value-form') as HTMLFormElement).onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget as HTMLFormElement);
        const raw = Object.fromEntries(fd.entries()) as Record<string, string>;
        const errors = validateEngineeringValueForm(raw);
        if (errors.length) { alert(errors.join(', ')); return; }
        const parsedValue = raw.valueType === 'number' ? Number(raw.value) : raw.valueType === 'boolean' ? raw.value === 'true' : raw.value;
        await client.createEngineeringValue({ projectId, componentId: raw.componentId, key: raw.key, label: raw.label, value: parsedValue, valueType: raw.valueType, unit: raw.unit || undefined, status: raw.status || 'user_entered' });
        await load();
      };

      view.querySelectorAll<HTMLButtonElement>('button[data-extract-doc-id]').forEach((btn) => {
        btn.onclick = async () => {
          const statusEl = view.querySelector(`#extract-status-${btn.dataset.extractDocId!}`) as HTMLElement;
          statusEl.textContent = 'Extracting...';
          try {
            const result = await client.extractValues({ projectId, documentId: btn.dataset.extractDocId! });
            statusEl.textContent = `Extracted ${result.candidateValues.length} candidate value(s)`;
            await load();
          } catch (error) {
            statusEl.textContent = error instanceof Error ? error.message : 'Extraction failed';
          }
        };
      });

      view.querySelectorAll<HTMLButtonElement>('button[data-status-id]').forEach((btn) => {
        btn.onclick = async () => { await client.updateEngineeringValueStatus(btn.dataset.statusId!, btn.dataset.status as 'approved' | 'rejected'); await load(); };
      });

      (view.querySelector('#document-form') as HTMLFormElement).onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget as HTMLFormElement);
        const selectedFile = fd.get('file');
        if (!(selectedFile instanceof File)) { alert('File is required'); return; }
        await client.uploadDocument(projectId, selectedFile, String(fd.get('documentType') || 'other'));
        await load();
      };

      (view.querySelector('#calc-form') as HTMLFormElement).onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget as HTMLFormElement);
        const result = await client.hydraulicPowerKw({ projectId, flowLpm: Number(fd.get('flowLpm')), pressureBar: Number(fd.get('pressureBar')), efficiency: Number(fd.get('efficiency')) });
        (view.querySelector('#calc-result') as HTMLElement).textContent = JSON.stringify(result, null, 2);
      };
      return;
    }

    view.innerHTML = `
      <h2>Projects</h2>
      <ul id="project-list">${await renderProjectList(client)}</ul>
      <form id="project-form"><input name="name" placeholder="Project name" required/><input name="description" placeholder="Description"/><input name="projectType" placeholder="Project type" value="custom" required/><button>Create project</button></form>
    `;
    (view.querySelector('#project-form') as HTMLFormElement).onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget as HTMLFormElement);
      await client.createProject({ name: String(fd.get('name')), description: String(fd.get('description') || ''), projectType: String(fd.get('projectType')) });
      view.querySelector('#project-list')!.innerHTML = await renderProjectList(client);
    };
  };

  window.addEventListener('hashchange', () => { void load(); });
  void load();
}
