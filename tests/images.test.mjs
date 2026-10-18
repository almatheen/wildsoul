// NOTE: every fixture below is MOCKED. These tests prove the parsing and filtering logic only.
// They say nothing about how the live Wikipedia or Commons APIs behave.
import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePageImages, parseCommons, buildRecord, isAllowedLicense, stripHtml, chunk } from '../lib/imageMeta.mjs';

const wpFixture = {
  query: {
    normalized: [{ from: 'kākāpō', to: 'Kākāpō' }],
    redirects: [{ from: 'Titicaca water frog', to: 'Telmatobius culeus' }],
    pages: {
      1: { title: 'Kākāpō', pageimage: 'Kakapo.jpg', thumbnail: { source: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Kakapo.jpg/1280px-Kakapo.jpg', width: 1280, height: 900 }, original: { source: 'https://upload.wikimedia.org/wikipedia/commons/a/a1/Kakapo.jpg' } },
      2: { title: 'Telmatobius culeus', thumbnail: { source: 'https://evil.example/x.jpg' } },
    },
  },
};
const commonsFixture = {
  query: { pages: { 9: { title: 'File:Kakapo.jpg', imageinfo: [{ descriptionurl: 'https://commons.wikimedia.org/wiki/File:Kakapo.jpg', extmetadata: { Artist: { value: '<a href="//x">Jane <b>Doe</b></a>' }, LicenseShortName: { value: 'CC BY-SA 4.0' }, LicenseUrl: { value: 'https://creativecommons.org/licenses/by-sa/4.0' } } }] } } },
};

test('stripHtml removes tags and decodes entities', () => assert.equal(stripHtml('<a>Jane &amp; <b>Doe</b></a>&nbsp;'), 'Jane & Doe'));

test('parsePageImages follows normalisation and redirects', () => {
  const find = parsePageImages(wpFixture);
  assert.equal(find('kākāpō').title, 'Kākāpō');
  assert.equal(find('Titicaca water frog').title, 'Telmatobius culeus');
  assert.equal(find('Unknown'), undefined);
});

test('parseCommons extracts plain-text author and licence', () => {
  const c = parseCommons(commonsFixture);
  assert.equal(c['File:Kakapo.jpg'].author, 'Jane Doe');
  assert.equal(c['File:Kakapo.jpg'].license, 'CC BY-SA 4.0');
});

test('licence allowlist accepts CC0/CC BY/CC BY-SA/public domain and rejects NC, ND, fair use and unknown', () => {
  for (const ok of ['CC0', 'CC BY 4.0', 'CC BY-SA 3.0', 'CC-BY-SA-4.0', 'Public domain', 'PD-US', 'No restrictions']) assert.ok(isAllowedLicense(ok), ok);
  for (const bad of ['CC BY-NC 4.0', 'CC BY-ND 2.0', 'CC BY-NC-SA 3.0', 'Fair use', 'All rights reserved', '', undefined, 'GFDL']) assert.ok(!isAllowedLicense(bad), String(bad));
});

test('buildRecord builds a complete, unreviewed record for a good file', () => {
  const find = parsePageImages(wpFixture);
  const meta = parseCommons(commonsFixture)['File:Kakapo.jpg'];
  const { record } = buildRecord({ page: find('kākāpō'), meta, file: 'File:Kakapo.jpg', wikiTitle: 'Kākāpō' });
  assert.equal(record.author, 'Jane Doe');
  assert.equal(record.reviewed, false);
  assert.match(record.article, /wikipedia\.org\/wiki\/K%C4%81k%C4%81p%C5%8D$/);
  assert.ok(record.src.startsWith('https://upload.wikimedia.org/'));
});

test('buildRecord refuses missing image, foreign host, missing metadata, unknown author and bad licence', () => {
  const find = parsePageImages(wpFixture);
  const good = parseCommons(commonsFixture)['File:Kakapo.jpg'];
  assert.match(buildRecord({ page: undefined, meta: good, wikiTitle: 'X' }).reason, /no lead image/);
  assert.match(buildRecord({ page: find('Titicaca water frog'), meta: good, wikiTitle: 'X' }).reason, /upload\.wikimedia\.org/);
  assert.match(buildRecord({ page: find('kākāpō'), meta: undefined, wikiTitle: 'X' }).reason, /no Commons metadata/);
  assert.match(buildRecord({ page: find('kākāpō'), meta: { ...good, author: '' }, wikiTitle: 'X' }).reason, /author unknown/);
  assert.match(buildRecord({ page: find('kākāpō'), meta: { ...good, license: 'CC BY-NC 4.0' }, wikiTitle: 'X' }).reason, /allowlist/);
});

test('chunk splits lists for batched API requests', () => assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]));
