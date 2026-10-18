import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers.mjs';
import { validateCatalogue } from '../lib/validateCatalogue.mjs';
import { groupsFor, relationsFor, GROUP_DEFS, pick, buildCatalogue } from '../lib/catalogue.mjs';

const d = load();
const GROUPS = ['Mammals', 'Birds', 'Reptiles', 'Amphibians', 'Fish', 'Invertebrates'];

test('catalogue has exactly 48 species', () => assert.equal(d.species.length, 48));

for (const g of GROUPS) {
  test(`group ${g} has exactly 8 species`, () => assert.equal(d.species.filter((s) => s.group === g).length, 8));
}

test('group counts come from the shared dataset (groupsFor)', () => {
  const groups = groupsFor(d.species);
  assert.deepEqual(groups.map((g) => g.name), GROUPS);
  groups.forEach((g) => assert.equal(g.members.length, 8));
});

test('slugs, common names and scientific names are unique', () => {
  for (const f of ['slug', 'name', 'scientificName']) assert.equal(new Set(d.species.map((s) => s[f])).size, 48, f);
});

test('validateCatalogue reports no errors', () => {
  const r = validateCatalogue({ species: d.species, archived: d.archived, config: d.config, enrichment: d.enrichment, images: d.images, target: d.config.target });
  assert.deepEqual(r.errors, []);
});

test('the two archived mammals are preserved in source data and not in the catalogue', () => {
  assert.deepEqual(d.archived.map((a) => a.slug).sort(), ['bengal-tiger', 'sumatran-orangutan']);
  d.archived.forEach((a) => {
    assert.ok(d.legacy.species.some((s) => s.id === a.slug), 'still in the legacy dataset');
    assert.ok(d.enrichment.species[a.slug], 'still in the enrichment overlay');
    assert.ok(!d.species.some((s) => s.slug === a.slug));
    assert.ok(a.reason.length > 20);
  });
});

test('all 13 retained original species are present', () => {
  const kept = ['amur-leopard', 'vaquita', 'javan-rhino', 'mountain-gorilla', 'blue-whale', 'saola', 'red-panda', 'snow-leopard', 'kakapo', 'philippine-eagle', 'california-condor', 'hawksbill-turtle', 'axolotl'];
  kept.forEach((k) => assert.ok(d.species.some((s) => s.slug === k), k));
});

test('not every species is Critically Endangered, and all three categories occur', () => {
  const codes = new Set(d.species.map((s) => s.status.code));
  assert.deepEqual([...codes].sort(), ['CR', 'EN', 'VU']);
});

test('related slugs exist, are not self-references and are unique', () => {
  const slugs = new Set(d.species.map((s) => s.slug));
  d.species.forEach((s) => {
    assert.ok(s.related.length >= 1, `${s.slug} has related species`);
    assert.equal(new Set(s.related).size, s.related.length);
    s.related.forEach((r) => { assert.ok(slugs.has(r), `${s.slug} -> ${r}`); assert.notEqual(r, s.slug); });
  });
});

test('relationsFor derives taxonomy, habitat and threat relations that match the data', () => {
  const labels = { habitat: d.enrichment.habitatTags, threat: Object.fromEntries(Object.entries(d.enrichment.threatTags).map(([k, v]) => [k, v.label])) };
  const rel = relationsFor(d.species, 'hawksbill-turtle', labels);
  assert.ok(rel.taxonomic.some((r) => r.species.slug === 'green-sea-turtle' && r.type === 'family'));
  assert.ok(rel.habitat.every((r) => r.tags.every((t) => d.species.find((s) => s.slug === 'hawksbill-turtle').habitatTags.includes(t))));
  assert.ok(rel.threat.every((r) => r.species.slug !== 'hawksbill-turtle'));
  assert.deepEqual(relationsFor(d.species, 'no-such-slug', labels).taxonomic, []);
});

test('population series are only present with provenance (none are present today)', () => {
  d.species.forEach((s) => {
    assert.equal(s.population.series.length, 0);
    assert.equal(s.population.estimate, null);
    assert.equal(s.population.available, false);
  });
});

test('featured list has 6-8 valid species spanning several groups; network list is valid', () => {
  assert.ok(d.config.featured.length >= 6 && d.config.featured.length <= 8);
  const feat = pick(d.species, d.config.featured, 'featured');
  assert.ok(new Set(feat.map((s) => s.group)).size >= 5);
  assert.ok(pick(d.species, d.config.network, 'network').length >= 8);
  assert.throws(() => pick(d.species, ['nope'], 'x'), /unknown species slug/);
});

test('every status is flagged as not re-checked against live IUCN data', () => {
  d.species.forEach((s) => assert.equal(s.statusVerified, false));
});

test('validator catches a wrong group count, a duplicate and a bad related slug', () => {
  const broken = d.species.map((s) => ({ ...s }));
  broken[0] = { ...broken[0], group: 'Birds' };
  let r = validateCatalogue({ species: broken, archived: d.archived, config: d.config, enrichment: d.enrichment, images: d.images, target: d.config.target });
  assert.ok(r.errors.some((e) => e.includes('Group Birds: expected 8')));
  const dup = [...d.species, { ...d.species[0] }];
  r = validateCatalogue({ species: dup, archived: d.archived, config: d.config, enrichment: d.enrichment, images: d.images, target: d.config.target });
  assert.ok(r.errors.some((e) => e.includes('Duplicate slug')));
  const bad = d.species.map((s, i) => (i === 0 ? { ...s, related: ['ghost'] } : s));
  r = validateCatalogue({ species: bad, archived: d.archived, config: d.config, enrichment: d.enrichment, images: d.images, target: d.config.target });
  assert.ok(r.errors.some((e) => e.includes('"ghost" does not exist')));
});

test('buildCatalogue throws when enrichment is missing for a legacy species', () => {
  const enr = { ...d.enrichment, species: { ...d.enrichment.species } };
  delete enr.species['saola'];
  assert.throws(() => buildCatalogue({ legacy: d.legacy, enrichment: enr, additions: d.additions, images: {}, config: d.config }), /Missing enrichment/);
});

test('group definitions cover all six groups', () => assert.deepEqual(GROUP_DEFS.map((g) => g.name), GROUPS));
