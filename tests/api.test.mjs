import test from 'node:test';
import assert from 'node:assert/strict';
import { server } from '../server.mjs';

test('server REST API stubs for /api/session', async (t) => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  t.after(() => {
    server.close();
  });

  await t.test('GET /api/session returns 200 with placeholder session', async () => {
    const res = await fetch(`${baseUrl}/api/session`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.user);
    assert.equal(data.user.role, 'member');
  });

  await t.test('POST /api/session returns 200 with user profile', async () => {
    const res = await fetch(`${baseUrl}/api/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account: 'teammate', password: 'test-password' }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.user);
    assert.equal(data.user.account, 'teammate');
  });

  await t.test('DELETE /api/session returns 204 No Content', async () => {
    const res = await fetch(`${baseUrl}/api/session`, {
      method: 'DELETE',
    });
    assert.equal(res.status, 204);
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
