import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { ZodError, z } from 'zod';
import {
  dataStatusSchema,
  type Component,
  type DataStatus,
  type Document,
  type EngineeringModule,
  type EngineeringValue,
  type Project
} from '@ommatidia/shared';
import { hydraulicPowerKw, toSharedCalculationResult } from '@ommatidia/calculations';

interface Repository<T extends { id: string }> {
  create(value: T): T;
  list(): T[];
  getById(id: string): T | undefined;
  update(id: string, value: T): T | undefined;
  delete(id: string): boolean;
}

class InMemoryRepository<T extends { id: string }> implements Repository<T> {
  private store = new Map<string, T>();
  create(value: T): T { this.store.set(value.id, value); return value; }
  list(): T[] { return Array.from(this.store.values()); }
  getById(id: string): T | undefined { return this.store.get(id); }
  update(id: string, value: T): T | undefined { if (!this.store.has(id)) return undefined; this.store.set(id, value); return value; }
  delete(id: string): boolean { return this.store.delete(id); }
}

const projectCreateSchema = z.object({ name: z.string(), description: z.string().optional(), projectType: z.string() });
const documentCreateSchema = z.object({ projectId: z.string(), title: z.string(), fileName: z.string(), mimeType: z.string(), uploadedBy: z.string().optional() });
const componentCreateSchema = z.object({ projectId: z.string(), name: z.string(), type: z.string(), description: z.string().optional() });
const valueCreateSchema = z.object({
  projectId: z.string(), componentId: z.string().optional(), documentId: z.string().optional(), key: z.string(), label: z.string(),
  value: z.union([z.number(), z.string(), z.boolean(), z.array(z.record(z.any())), z.array(z.any())]), valueType: z.enum(['number', 'string', 'boolean', 'table', 'list']),
  unit: z.string().optional(), status: dataStatusSchema, sourceReferences: z.array(z.object({ documentId: z.string(), pageNumber: z.number().optional(), sectionTitle: z.string().optional(), sourceText: z.string().optional(), boundingBox: z.object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() }).optional() })),
  confidence: z.number().optional(), notes: z.string().optional()
});
const moduleCreateSchema = z.object({
  name: z.string(), description: z.string(), moduleType: z.enum(['extraction', 'summary', 'comparison', 'calculation', 'checklist', 'report']),
  applicableProjectTypes: z.array(z.string()), inputs: z.array(z.object({ key: z.string(), label: z.string(), description: z.string().optional(), valueType: z.enum(['number', 'string', 'boolean', 'table', 'list']), unit: z.string().optional(), required: z.boolean() })),
  outputs: z.array(z.object({ key: z.string(), label: z.string(), description: z.string().optional(), valueType: z.enum(['number', 'string', 'boolean', 'table', 'list']), unit: z.string().optional(), required: z.boolean() })),
  validationRules: z.array(z.string()).optional(), calculationMethod: z.string().optional(), reportTemplate: z.string().optional()
});
const valueStatusUpdateSchema = z.object({ status: dataStatusSchema });
const calcSchema = z.object({ projectId: z.string(), flowLpm: z.number(), pressureBar: z.number(), efficiency: z.number() });

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch { reject(new Error('Invalid JSON body')); } });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

function parseId(pathname: string): string | undefined { return pathname.split('/')[3]; }

export function createApiHandler() {
  const projects = new InMemoryRepository<Project>();
  const documents = new InMemoryRepository<Document>();
  const components = new InMemoryRepository<Component>();
  const values = new InMemoryRepository<EngineeringValue>();
  const modules = new InMemoryRepository<EngineeringModule>();

  return async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const method = req.method ?? 'GET';
    const url = new URL(req.url ?? '/', 'http://localhost');
    const { pathname, searchParams } = url;

    try {
      if (method === 'POST' && pathname === '/projects') {
        const body = projectCreateSchema.parse(await readBody(req));
        return sendJson(res, 201, projects.create({ ...body, id: randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }));
      }
      if (method === 'GET' && pathname === '/projects') return sendJson(res, 200, projects.list());
      if (pathname.startsWith('/projects/')) {
        const id = parseId(pathname)!; const existing = projects.getById(id); if (!existing) return sendJson(res, 404, { error: 'Project not found' });
        if (method === 'GET') return sendJson(res, 200, existing);
        if (method === 'PUT') {
          const body = projectCreateSchema.parse(await readBody(req));
          return sendJson(res, 200, projects.update(id, { ...existing, ...body, updatedAt: new Date().toISOString() }));
        }
        if (method === 'DELETE') { projects.delete(id); return sendJson(res, 200, { deleted: true }); }
      }

      if (method === 'POST' && pathname === '/documents') {
        const body = documentCreateSchema.parse(await readBody(req));
        return sendJson(res, 201, documents.create({ ...body, id: randomUUID(), uploadedAt: new Date().toISOString() }));
      }
      if (method === 'GET' && pathname === '/documents') {
        const projectId = searchParams.get('projectId');
        return sendJson(res, 200, projectId ? documents.list().filter((d) => d.projectId === projectId) : documents.list());
      }
      if (pathname.startsWith('/documents/')) {
        const id = parseId(pathname)!; const existing = documents.getById(id); if (!existing) return sendJson(res, 404, { error: 'Document not found' });
        if (method === 'GET') return sendJson(res, 200, existing);
        if (method === 'PUT') { const body = documentCreateSchema.parse(await readBody(req)); return sendJson(res, 200, documents.update(id, { ...existing, ...body })); }
        if (method === 'DELETE') { documents.delete(id); return sendJson(res, 200, { deleted: true }); }
      }

      if (method === 'POST' && pathname === '/components') {
        const body = componentCreateSchema.parse(await readBody(req));
        return sendJson(res, 201, components.create({ ...body, id: randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }));
      }
      if (method === 'GET' && pathname === '/components') {
        const projectId = searchParams.get('projectId');
        return sendJson(res, 200, projectId ? components.list().filter((c) => c.projectId === projectId) : components.list());
      }
      if (pathname.startsWith('/components/')) {
        const id = parseId(pathname)!; const existing = components.getById(id); if (!existing) return sendJson(res, 404, { error: 'Component not found' });
        if (method === 'GET') return sendJson(res, 200, existing);
        if (method === 'PUT') { const body = componentCreateSchema.parse(await readBody(req)); return sendJson(res, 200, components.update(id, { ...existing, ...body, updatedAt: new Date().toISOString() })); }
        if (method === 'DELETE') { components.delete(id); return sendJson(res, 200, { deleted: true }); }
      }

      if (method === 'POST' && pathname === '/engineering-values') {
        const body = valueCreateSchema.parse(await readBody(req));
        return sendJson(res, 201, values.create({ ...body, id: randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }));
      }
      if (method === 'GET' && pathname === '/engineering-values') {
        const projectId = searchParams.get('projectId'); const componentId = searchParams.get('componentId');
        return sendJson(res, 200, values.list().filter((v) => (!projectId || v.projectId === projectId) && (!componentId || v.componentId === componentId)));
      }
      if (method === 'PATCH' && /^\/engineering-values\/[^/]+\/status$/.test(pathname)) {
        const id = pathname.split('/')[2];
        const existing = values.getById(id);
        if (!existing) return sendJson(res, 404, { error: 'Engineering value not found' });
        const body = valueStatusUpdateSchema.parse(await readBody(req));
        return sendJson(res, 200, values.update(id, { ...existing, status: body.status as DataStatus, updatedAt: new Date().toISOString() }));
      }
      if (pathname.startsWith('/engineering-values/')) {
        const id = parseId(pathname)!; const existing = values.getById(id); if (!existing) return sendJson(res, 404, { error: 'Engineering value not found' });
        if (method === 'GET') return sendJson(res, 200, existing);
        if (method === 'PUT') { const body = valueCreateSchema.parse(await readBody(req)); return sendJson(res, 200, values.update(id, { ...existing, ...body, updatedAt: new Date().toISOString() })); }
        if (method === 'DELETE') { values.delete(id); return sendJson(res, 200, { deleted: true }); }
      }

      if (method === 'POST' && pathname === '/engineering-modules') { const body = moduleCreateSchema.parse(await readBody(req)); return sendJson(res, 201, modules.create({ ...body, id: randomUUID() })); }
      if (method === 'GET' && pathname === '/engineering-modules') return sendJson(res, 200, modules.list());
      if (pathname.startsWith('/engineering-modules/')) {
        const id = parseId(pathname)!; const existing = modules.getById(id); if (!existing) return sendJson(res, 404, { error: 'Engineering module not found' });
        if (method === 'GET') return sendJson(res, 200, existing);
        if (method === 'PUT') { const body = moduleCreateSchema.parse(await readBody(req)); return sendJson(res, 200, modules.update(id, { ...existing, ...body })); }
        if (method === 'DELETE') { modules.delete(id); return sendJson(res, 200, { deleted: true }); }
      }

      if (method === 'POST' && pathname === '/calculations/hydraulic-power-kw') {
        const input = calcSchema.parse(await readBody(req));
        const result = hydraulicPowerKw(input.flowLpm, input.pressureBar, input.efficiency);
        return sendJson(res, 200, toSharedCalculationResult('hydraulicPowerKw', input.projectId, 'hydraulic_power_kw', 'Hydraulic power', result));
      }

      return sendJson(res, 404, { error: 'Not found' });
    } catch (error) {
      if (error instanceof ZodError) return sendJson(res, 400, { error: 'Validation failed', details: error.issues });
      if (error instanceof Error) return sendJson(res, 400, { error: error.message });
      return sendJson(res, 500, { error: 'Unknown error' });
    }
  };
}

export function startApiServer(port = 3000) {
  const server = createServer(createApiHandler());
  server.listen(port);
  return server;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  startApiServer();
}
