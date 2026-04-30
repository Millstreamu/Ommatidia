import { createServer, request as httpRequest } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { IncomingMessage, RequestOptions, ServerResponse } from 'node:http';

const API_PROXY_TARGET = process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:3001';

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Engineering Design Assistant</title>
    <link rel="stylesheet" href="/styles.css">
  </head>
  <body>
    <div id="app" class="container">Loading Engineering Design Assistant…</div>
    <script type="module">
      import { mountApp, resolveApiBaseUrl } from '/app.js';

      const root = document.getElementById('app');
      try {
        if (!root) {
          throw new Error('Missing app root element');
        }
        mountApp(root, window.__API_BASE_URL__ || resolveApiBaseUrl(window.location.hostname));
      } catch (error) {
        if (root) {
          root.innerHTML = '<div style="padding:16px;border:1px solid #fecaca;border-radius:8px;background:#fef2f2;color:#991b1b;"><h1 style="margin:0 0 8px;">Application failed to load</h1><p style="margin:0;">Please check the browser console for details.</p></div>';
        }
        console.error('Failed to mount app', error);
      }
    </script>
  </body>
</html>`;

const JS_ROUTE_TO_FILE: Record<string, string> = {
  '/app.js': 'dist/app.js',
  '/apiClient.js': 'dist/apiClient.js',
  '/styles.css': 'src/styles.css'
};

const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  '.js': 'application/javascript; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8'
};

function copyResponseHeaders(proxyResponse: IncomingMessage, res: ServerResponse): void {
  for (const [name, value] of Object.entries(proxyResponse.headers ?? {})) {
    if (value === undefined) continue;
    res.setHeader(name, value);
  }
}

async function proxyApiRequest(req: IncomingMessage, res: ServerResponse, urlPath: string): Promise<boolean> {
  if (!urlPath.startsWith('/api/')) {
    return false;
  }

  const target = new URL(API_PROXY_TARGET);
  const forwardPath = urlPath.slice(4);
  const originalUrl = new URL(req.url ?? '/', 'http://localhost');
  const pathWithQuery = `${forwardPath}${originalUrl.search}`;

  const headers = { ...req.headers };
  delete headers.host;

  const options: RequestOptions = {
    protocol: target.protocol,
    hostname: target.hostname,
    port: target.port,
    method: req.method,
    path: pathWithQuery,
    headers
  };

  await new Promise<void>((resolvePromise) => {
    const upstream = httpRequest(options, (proxyResponse) => {
      res.statusCode = (proxyResponse as IncomingMessage & { statusCode?: number }).statusCode ?? 502;
      copyResponseHeaders(proxyResponse, res);
      proxyResponse.pipe(res);
      proxyResponse.on('end', resolvePromise);
    });

    upstream.on('error', (error) => {
      res.statusCode = 502;
      res.setHeader('content-type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'API proxy request failed', message: (error as Error).message }));
      resolvePromise();
    });

    req.pipe(upstream);
  });

  return true;
}

async function serveStaticAsset(urlPath: string, res: ServerResponse): Promise<boolean> {
  const directAsset = JS_ROUTE_TO_FILE[urlPath];
  const mapAsset = urlPath.endsWith('.map') ? JS_ROUTE_TO_FILE[urlPath.slice(0, -4)] + '.map' : undefined;
  const filePath = directAsset ?? mapAsset;

  if (!filePath) {
    if (urlPath.endsWith('.js') || urlPath.endsWith('.js.map') || urlPath.endsWith('.map') || urlPath.endsWith('.css')) {
      res.statusCode = 404;
      res.setHeader('content-type', 'text/plain; charset=utf-8');
      res.end('Not found');
      return true;
    }
    return false;
  }

  try {
    const body = await readFile(resolve(process.cwd(), filePath), 'utf-8');
    const extension = urlPath.endsWith('.js') ? '.js' : urlPath.endsWith('.map') ? '.map' : urlPath.endsWith('.css') ? '.css' : '';
    res.statusCode = 200;
    res.setHeader('content-type', CONTENT_TYPE_BY_EXTENSION[extension] ?? 'application/octet-stream');
    res.end(body);
  } catch {
    res.statusCode = 404;
    res.setHeader('content-type', 'text/plain; charset=utf-8');
    res.end('Not found');
  }
  return true;
}

export function startWebApp(port = 3000): ReturnType<typeof createServer> {
  const server = createServer(async (req, res) => {
    const path = (req.url ?? '/').split('?')[0] ?? '/';
    if (await proxyApiRequest(req, res, path)) return;
    if (await serveStaticAsset(path, res)) return;
    if (path !== '/') {
      res.statusCode = 404;
      res.setHeader('content-type', 'text/plain; charset=utf-8');
      res.end('Not found');
      return;
    }
    res.statusCode = 200;
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.end(html);
  });
  server.listen(port);
  return server;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  startWebApp();
}
