import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';

// User database (Angus): db/ is CommonJS, so load it with require.
// Needs `npm install` inside db/ first (better-sqlite3).
const require = createRequire(import.meta.url);
const { findUserByAccount, findUserById } = require('./db/users.js');
const { verifyPassword, hashPassword } = require('./db/auth.js');

// ---- Sessions (server-side, in memory: restarting the server logs everyone out) ----
const SESSION_COOKIE = 'session';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours
const sessions = new Map(); // sessionId -> { userId, expiresAt }
const DUMMY_HASH = hashPassword(randomBytes(16).toString('hex'));

function readCookie(req, name) {
  for (const part of (req.headers.cookie || '').split(';')) {
    const index = part.indexOf('=');
    if (index > -1 && part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
  }
  return '';
}

function sessionCookie(sessionId) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${sessionId}; Path=/; Max-Age=${SESSION_TTL_MS / 1000}; HttpOnly; SameSite=Lax${secure}`;
}

function publicUser(user) {
  return { id: user.id, account: user.account, role: user.role };
}

// Returns the logged-in user for this request, or null if the session is missing or expired.
async function getCurrentUser(req) {
  const sessionId = readCookie(req, SESSION_COOKIE);
  if (!sessionId) return null;
  const session = sessions.get(sessionId);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(sessionId);
    return null;
  }
  const user = await findUserById(session.userId);
  if (!user) sessions.delete(sessionId);
  return user;
}

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
        let body;
        try {
          body = await readJSONBody(req);
        } catch {
          return sendJSON(res, 400, { error: 'Invalid JSON body' });
        }
        const { account, password } = body && typeof body === 'object' ? body : {};
        if (typeof account !== 'string' || !account.trim() || typeof password !== 'string' || !password) {
          return sendJSON(res, 400, { error: 'Account and password are required' });
        }
        if (account.length > 200 || password.length > 1024) {
          return sendJSON(res, 400, { error: 'Account or password is too long' });
        }
        try {
          const user = await findUserByAccount(account.trim());
          // Check a dummy hash when the account doesn't exist so both failures take similar time.
          const valid = await verifyPassword(password, user ? user.password_hash : DUMMY_HASH);
          if (!user || !valid) return sendJSON(res, 401, { error: 'Invalid account or password' });

          const oldSessionId = readCookie(req, SESSION_COOKIE);
          if (oldSessionId) sessions.delete(oldSessionId);
          const sessionId = randomBytes(32).toString('base64url');
          sessions.set(sessionId, { userId: user.id, expiresAt: Date.now() + SESSION_TTL_MS });
          return sendJSON(res, 200, { user: publicUser(user) }, { 'Set-Cookie': sessionCookie(sessionId) });
        } catch (err) {
          console.error('Login failed:', err);
          return sendJSON(res, 500, { error: 'Login is unavailable right now. Please try again.' });
        }
      }

      if (req.method === 'GET') {
        // # API_GET_SESSION: Retrieve currently signed-in user session
        try {
          const user = await getCurrentUser(req);
          if (!user) return sendJSON(res, 401, { error: 'Not logged in' });
          return sendJSON(res, 200, { user: publicUser(user) });
        } catch (err) {
          console.error('Session check failed:', err);
          return sendJSON(res, 500, { error: 'Could not check your session. Please try again.' });
        }
      }

      if (req.method === 'DELETE') {
        // # API_DELETE_SESSION: End the session (logout)
        // Invalidate the session on the server, then tell the browser to drop the cookie.
        const sessionId = readCookie(req, SESSION_COOKIE);
        if (sessionId) sessions.delete(sessionId);
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
