import test from 'node:test';
import assert from 'node:assert/strict';
import { seedData, loadData, safeURL, escapeHTML, reportCSV, csvCell } from '../public/data.js';

test('first visit has all diagram topic groups and clearly unconfigured registration links', () => {
  const data = seedData();
  assert.equal(data.articles.length, 5);
  assert.deepEqual(new Set(data.listings.map(x => x.type)), new Set(['Class', 'Public lecture', 'Charity event']));
  assert.ok(data.listings.every(x => !x.url));
});
test('saved browser data round-trips and malformed data is not silently replaced', () => {
  const data = seedData();
  data.entries.push({ note: 'private reflection' });
  assert.deepEqual(loadData({ getItem: () => JSON.stringify(data) }), data);
  assert.throws(() => loadData({ getItem: () => 'broken json' }));
  assert.throws(() => loadData({ getItem: () => '{"articles":[]}' }));
  assert.equal(loadData({ getItem: () => null }).entries.length, 0);
});
test('user-authored content is escaped and links reject executable schemes', () => {
  assert.equal(escapeHTML('<script>"x" & \'y\'</script>'), '&lt;script&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/script&gt;');
  for (const url of ['javascript:alert(1)', 'data:text/html,<script>', 'invalid', '/relative']) assert.equal(safeURL(url), '');
  assert.equal(safeURL('https://example.org/signup'), 'https://example.org/signup');
});
test('report contains content counts and review counts, never private text', () => {
  const data = seedData();
  data.entries.push({ note: 'PRIVATE ENTRY' });
  data.questions.push({ question: 'PRIVATE QUESTION', status: 'pending' }, { question: 'OTHER QUESTION', status: 'published' });
  const csv = reportCSV(data);
  assert.ok(csv.includes('"Awaiting review","1"'));
  assert.ok(csv.includes('"Published answers","1"'));
  assert.ok(!csv.includes('PRIVATE') && !csv.includes('OTHER QUESTION'));
  assert.ok(!csv.includes('reflections'));
});
test('CSV cells escape delimiters and spreadsheet formula prefixes', () => {
  assert.equal(csvCell('a,"b"'), '"a,""b"""');
  assert.equal(csvCell('=1+1'), '"\'=1+1"');
});
