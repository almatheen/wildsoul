import test from 'node:test';
import assert from 'node:assert/strict';
import { safeExternalUrl, safeImageUrl } from '../lib/safeUrl.mjs';

test('safeExternalUrl accepts http(s) only and rejects credentials and junk', () => {
  assert.equal(safeExternalUrl('https://example.org/a?b=1'), 'https://example.org/a?b=1');
  for (const bad of ['javascript:alert(1)', 'data:text/html,x', 'ftp://x.org', 'https://u:p@x.org', '//x.org', '', null, undefined, 42, 'https://' + 'a'.repeat(3000)]) {
    assert.equal(safeExternalUrl(bad), null, String(bad).slice(0, 30));
  }
});

test('safeImageUrl only allows https upload.wikimedia.org', () => {
  assert.ok(safeImageUrl('https://upload.wikimedia.org/wikipedia/commons/a/a1/X.jpg'));
  for (const bad of ['http://upload.wikimedia.org/x.jpg', 'https://evil.example/x.jpg', 'https://upload.wikimedia.org.evil.example/x.jpg', 'javascript:1']) {
    assert.equal(safeImageUrl(bad), null, bad);
  }
});
