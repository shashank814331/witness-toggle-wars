import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

export interface StaticServerHandle {
  readonly url: string;
  close(): Promise<void>;
}

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

/**
 * Starts an in-process static HTTP server on an ephemeral localhost port for E2E tests.
 */
export function startStaticServer(rootDir: string): Promise<StaticServerHandle> {
  const absRoot = path.resolve(rootDir);
  const server = http.createServer((req, res) => {
    const rawPath = (req.url ?? '/').split('?')[0] ?? '/';
    const relPath = rawPath === '/' ? 'index.html' : rawPath.replace(/^\/+/, '');
    const filePath = path.resolve(absRoot, relPath);

    if (!filePath.startsWith(absRoot) || !fs.existsSync(filePath)) {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath);
    res.statusCode = 200;
    res.setHeader('Content-Type', MIME_TYPES[ext] ?? 'application/octet-stream');
    res.end(fs.readFileSync(filePath));
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr !== null ? addr.port : 4511;
      resolve({
        url: `http://127.0.0.1:${String(port)}`,
        close: (): Promise<void> =>
          new Promise((done) => {
            server.close(() => {
              done();
            });
          }),
      });
    });
  });
}
