import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(fileURLToPath(new URL('./public/', import.meta.url)));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };
function readJSONBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1e6) {
        req.socket.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body.trim()) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendJSON(res, status, data, headers = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store',
    ...headers,
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const pathname = decodeURIComponent(url.pathname);

  // # API_ROUTES: RESTful API router for backend teammate integration.
  // Full specifications and contract details are documented in README.md.
  if (pathname.startsWith('/api/')) {
    // Session / Authentication endpoints (RESTful)
    if (pathname === '/api/session') {
      if (req.method === 'POST') {
        // # API_POST_LOGIN: Authenticate user & create session
        // Teammate TODO:
        // 1. Verify req.body contains { account, password }
        // 2. Validate credentials against database/user store
        // 3. Issue a secure session cookie (HttpOnly, Secure, SameSite)
        // 4. Return 401 on failure, or 200 with user profile on success
        try {
          const body = await readJSONBody(req);
          return sendJSON(res, 200, {
            user: {
              id: 'user-preview-id',
              account: body.account || 'demo_user',
              role: body.account === 'admin' ? 'organizer' : 'member',
            },
            status: 'placeholder',
            message: 'POST /api/session stub ready. Awaiting backend authentication setup.',
          });
        } catch {
          return sendJSON(res, 400, { error: 'Invalid JSON body' });
        }
      }

      if (req.method === 'GET') {
        // # API_GET_SESSION: Retrieve currently signed-in user session
        // Teammate TODO:
        // 1. Read session cookie or Authorization header from req.headers
        // 2. Look up session in session store/database
        // 3. Return 401 if unauthenticated, or 200 with user info if valid
        return sendJSON(res, 200, {
          user: {
            id: 'user-preview-id',
            account: 'demo_user',
            role: 'member',
          },
          status: 'placeholder',
          message: 'GET /api/session stub ready. Awaiting backend session lookup.',
        });
      }

      if (req.method === 'DELETE') {
        // # API_DELETE_SESSION: End the session (logout)
        // Teammate TODO:
        // 1. Invalidate session in session store/database
        // 2. Clear session cookie (Max-Age=0)
        res.writeHead(204, {
          'Set-Cookie': 'session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax',
        });
        res.end();
        return;
      }

      res.writeHead(405, { Allow: 'GET, POST, DELETE' });
      res.end();
      return;
    }

    // Stub for other REST resources: /api/articles, /api/listings, /api/reflections, etc.
    return sendJSON(res, 501, {
      error: 'Not Implemented',
      message: `Endpoint ${req.method} ${pathname} is awaiting backend implementation.`,
      documentation: 'See README.md under REST API integration markers.',
    });
  }

  // Static file serving for the frontend
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    res.end();
    return;
  }
  try {
    const target = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!target.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
    const body = await readFile(target);
    res.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-cache' });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch { res.writeHead(404); res.end('Page not found'); }
});

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  server.listen(Number(process.env.PORT || 3000), '127.0.0.1', () => console.log(`Local: http://localhost:${server.address().port}`));
}

export { server };
