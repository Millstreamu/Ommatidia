import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const html = `<!doctype html><html><body><div id="app"></div><script type="module">import { mountApp, resolveApiBaseUrl } from '/app.js'; const root = document.getElementById('app'); try { if (!root) throw new Error('Missing app root element'); mountApp(root, window.__API_BASE_URL__ || resolveApiBaseUrl(window.location.hostname)); } catch (error) { if (root) { root.innerHTML = '<div style="padding:16px;font-family:sans-serif;color:#b91c1c;"><h1>Application failed to load</h1><p>Please check the browser console for details.</p></div>'; } console.error('Failed to mount app', error); }</script></body></html>`;

export function startWebApp(port = 3000): ReturnType<typeof createServer> {
  const server = createServer(async (req, res) => {
    if ((req.url ?? '/') === '/app.js') {
      const appJs = await readFile(resolve(process.cwd(), 'dist/app.js'), 'utf-8');
      res.setHeader('content-type', 'application/javascript');
      return res.end(appJs);
    }
    if ((req.url ?? '/') === '/apiClient.js') {
      const apiJs = await readFile(resolve(process.cwd(), 'dist/apiClient.js'), 'utf-8');
      res.setHeader('content-type', 'application/javascript');
      return res.end(apiJs);
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
