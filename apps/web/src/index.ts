import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const html = `<!doctype html><html><body><div id="app"></div><script type="module">import { mountApp } from '/app.js'; mountApp(document.getElementById('app'), window.__API_BASE_URL__ || 'http://127.0.0.1:3000');</script></body></html>`;

export function startWebApp(port = 5173): ReturnType<typeof createServer> {
  const server = createServer(async (req, res) => {
    if ((req.url ?? '/') === '/app.js') {
      const appJs = await readFile(resolve(process.cwd(), 'dist/app.js'), 'utf-8');
      const apiJs = await readFile(resolve(process.cwd(), 'dist/apiClient.js'), 'utf-8');
      res.setHeader('content-type', 'application/javascript');
      return res.end(`${apiJs}\n${appJs.replace("from './apiClient.js';", '')}`);
    }
    res.setHeader('content-type', 'text/html');
    res.end(html);
  });
  server.listen(port);
  return server;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  startWebApp();
}
