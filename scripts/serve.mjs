import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const root = process.cwd();
const port = process.env.PORT ? Number(process.env.PORT) : 4173;
const host = process.env.HOST || '127.0.0.1';

const mimeByExt = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

function resolvePath(urlPath) {
  const safePath = normalize(urlPath).replace(/^([.][./\\])+/, '');
  const relativePath = safePath.replace(/^\/+/, '');
  if (!relativePath || relativePath === '.') {
    return join(root, 'index.html');
  }
  return join(root, relativePath);
}

const server = createServer(async (req, res) => {
  try {
    const targetPath = resolvePath(new URL(req.url, `http://${req.headers.host}`).pathname);
    const file = await stat(targetPath);
    if (!file.isFile()) {
      throw new Error('Not file');
    }

    const ext = extname(targetPath).toLowerCase();
    const mime = mimeByExt[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': mime,
      'Cache-Control': 'no-cache'
    });
    createReadStream(targetPath).pipe(res);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
  }
});

server.listen(port, host, () => {
  console.log(`Local server: http://${host}:${port}`);
});
