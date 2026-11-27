import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const version = process.argv[2] ?? 'v1';
if (!['v1', 'v2', 'mutant'].includes(version)) {
  throw new Error(`Unsupported APP_VERSION: ${version}`);
}

const port = Number(process.argv[3] ?? 4173);
if (!Number.isInteger(port) || port < 0 || port > 65535) {
  throw new Error(`Invalid port: ${process.argv[3]}`);
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'app', version);
const server = createServer(async (request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent((request.url ?? '/').split('?')[0]);
  } catch (error) {
    if (!(error instanceof URIError)) throw error;
    response.writeHead(400).end('Invalid path');
    return;
  }
  if (pathname.includes('\0') || pathname.includes('\\') || pathname.split('/').includes('..')) {
    response.writeHead(400).end('Invalid path');
    return;
  }
  const file = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
  if (!file.startsWith(`${root}${sep}`)) {
    response.writeHead(400).end('Invalid path');
    return;
  }
  try {
    const body = await readFile(file);
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(body);
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'EISDIR') {
      response.writeHead(404).end('Not found');
      return;
    }
    console.error('Failed to read resource:', error);
    response.writeHead(500).end('Internal server error');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Listening on http://127.0.0.1:${server.address().port}`);
});

process.on('SIGTERM', () => {
  server.close(error => {
    if (error) {
      console.error('Failed to stop server:', error);
      process.exitCode = 1;
    }
  });
});
