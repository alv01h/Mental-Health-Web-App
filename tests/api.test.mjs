import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

// db/db.js opens "app.db" in the current folder, so run the tests from a
// throwaway folder to keep test accounts out of the real database.
const tempDir = mkdtempSync(path.join(tmpdir(), 'capy-test-'));
const originalDir = process.cwd();
process.chdir(tempDir);
const require = createRequire(import.meta.url);
const db = require('../db/db.js');
const { createUser } = require('../db/users.js');
const { server } = await import('../server.mjs');

createUser('member1', 'member-password', 'member');
createUser('organizer1', 'organizer-password', 'organizer');

test.after(() => {
  db.close();
  process.chdir(originalDir);
  rmSync(tempDir, { recursive: true, force: true });
});

test('server REST API for /api/session', async (t) => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  t.after(() => {
    server.close();
  });

  const login = (body) => fetch(`${baseUrl}/api/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const sessionCookieFrom = (res) => res.headers.get('set-cookie').split(';')[0];

  await t.test('GET /api/session without a cookie returns 401', async () => {
    const res = await fetch(`${baseUrl}/api/session`);
    assert.equal(res.status, 401);
    assert.ok((await res.json()).error);
  });

  await t.test('GET /api/session with an unknown session cookie returns 401', async () => {
    const res = await fetch(`${baseUrl}/api/session`, { headers: { Cookie: 'session=not-a-real-session' } });
    assert.equal(res.status, 401);
  });

  await t.test('POST /api/session with a wrong password returns 401', async () => {
    const res = await login({ account: 'member1', password: 'wrong-password' });
    assert.equal(res.status, 401);
    assert.deepEqual(await res.json(), { error: 'Invalid account or password' });
    assert.equal(res.headers.get('set-cookie'), null);
  });

  await t.test('POST /api/session with an unknown account returns the same 401', async () => {
    const res = await login({ account: 'nobody', password: 'member-password' });
    assert.equal(res.status, 401);
    assert.deepEqual(await res.json(), { error: 'Invalid account or password' });
  });

  await t.test('POST /api/session with missing fields or bad JSON returns 400', async () => {
    assert.equal((await login({ account: 'member1' })).status, 400);
    assert.equal((await login({ account: '   ', password: 'x' })).status, 400);
    assert.equal((await login(null)).status, 400);
    const res = await fetch(`${baseUrl}/api/session`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{not json' });
    assert.equal(res.status, 400);
  });

  await t.test('POST /api/session logs in and sets an HttpOnly session cookie', async () => {
    const res = await login({ account: 'member1', password: 'member-password' });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.deepEqual(Object.keys(data.user).sort(), ['account', 'id', 'role']);
    assert.equal(data.user.account, 'member1');
    assert.equal(data.user.role, 'member');
    const cookie = res.headers.get('set-cookie');
    assert.match(cookie, /^session=[\w-]{20,};/);
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Lax/);
  });

  await t.test('GET /api/session returns the logged-in user from the cookie', async () => {
    const loginRes = await login({ account: 'organizer1', password: 'organizer-password' });
    const { user } = await loginRes.json();
    const res = await fetch(`${baseUrl}/api/session`, { headers: { Cookie: sessionCookieFrom(loginRes) } });
    assert.equal(res.status, 200);
    assert.deepEqual((await res.json()).user, user);
    assert.equal(user.role, 'organizer');
  });

  await t.test('logging in again replaces the old session', async () => {
    const first = await login({ account: 'member1', password: 'member-password' });
    const oldCookie = sessionCookieFrom(first);
    const second = await fetch(`${baseUrl}/api/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: oldCookie },
      body: JSON.stringify({ account: 'member1', password: 'member-password' }),
    });
    assert.equal(second.status, 200);
    assert.equal((await fetch(`${baseUrl}/api/session`, { headers: { Cookie: oldCookie } })).status, 401);
    assert.equal((await fetch(`${baseUrl}/api/session`, { headers: { Cookie: sessionCookieFrom(second) } })).status, 200);
  });

  await t.test('DELETE /api/session without a cookie still returns 204 No Content', async () => {
    const res = await fetch(`${baseUrl}/api/session`, {
      method: 'DELETE',
    });
    assert.equal(res.status, 204);
    assert.match(res.headers.get('set-cookie'), /^session=;.*Max-Age=0/);
  });

  await t.test('DELETE /api/session logs out: session is invalidated and cookie cleared', async () => {
    const loginRes = await login({ account: 'member1', password: 'member-password' });
    const cookie = sessionCookieFrom(loginRes);
    assert.equal((await fetch(`${baseUrl}/api/session`, { headers: { Cookie: cookie } })).status, 200);

    const res = await fetch(`${baseUrl}/api/session`, { method: 'DELETE', headers: { Cookie: cookie } });
    assert.equal(res.status, 204);
    assert.equal(await res.text(), '');
    assert.match(res.headers.get('set-cookie'), /^session=;.*Max-Age=0/);

    // Reusing the old cookie after logout no longer works.
    assert.equal((await fetch(`${baseUrl}/api/session`, { headers: { Cookie: cookie } })).status, 401);
  });

  await t.test('GET /api/unimplemented returns 501 Not Implemented', async () => {
    const res = await fetch(`${baseUrl}/api/articles`);
    assert.equal(res.status, 501);
    const data = await res.json();
    assert.equal(data.error, 'Not Implemented');
  });

  await t.test('GET / returns 200 index.html for static frontend', async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('Community Care'));
  });
});
