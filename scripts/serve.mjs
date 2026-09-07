import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publicRoot = resolve(projectRoot, 'dist');
const port = Number.parseInt(process.env.PORT ?? '8080', 10);

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml'
};

function sendText(response, status, message) {
  response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end(message);
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
    const pathname = decodeURIComponent(url.pathname);
    const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    let target = resolve(publicRoot, relativePath);

    if (target !== publicRoot && !target.startsWith(`${publicRoot}${sep}`)) {
      sendText(response, 403, 'Acceso denegado');
      return;
    }

    const targetStats = await stat(target);
    if (targetStats.isDirectory()) target = resolve(target, 'index.html');
    const body = await readFile(target);
    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Type': contentTypes[extname(target).toLowerCase()] ?? 'application/octet-stream'
    });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch (error) {
    const status = error?.code === 'ENOENT' ? 404 : 400;
    sendText(response, status, status === 404 ? 'File not found' : 'Invalid request');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Tetris Matrix Lab disponible en http://localhost:${port}`);
  console.log('Presiona Ctrl+C para detener el servidor.');
});

process.on('SIGINT', () => server.close(() => process.exit(0)));
