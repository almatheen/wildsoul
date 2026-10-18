import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers.mjs';
import bank from '../lib/quiz/bank.mjs';
import { validateQuizBank } from '../lib/quiz/validate.mjs';
import { THREAT_LABELS_FALLBACK } from '../lib/quiz/labels.mjs';

const d = load();

test('bank has six levels with five questions each (30 total)', () => {
  assert.equal(bank.levels.length, 6);
  bank.levels.forEach((lv) => assert.equal(lv.questions.length, 5, `level ${lv.level}`));
  assert.equal(bank.levels.flatMap((l) => l.questions).length, 30);
});

test('level titles follow the required progression', () => {
  assert.deepEqual(bank.levels.map((l) => l.title), ['Wildlife Rookie', 'Habitat Explorer', 'Nature Detective', 'Threat Tracker', 'Species Specialist', 'Conservation Champion']);
});

test('every question has four unique options and exactly one in-range keyed answer', () => {
  bank.levels.flatMap((l) => l.questions).forEach((q) => {
    assert.equal(q.options.length, 4, q.id);
    assert.equal(new Set(q.options.map((o) => o.label.toLowerCase())).size, 4, q.id);
    assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4, q.id);
  });
});

test('question ids and prompts are unique', () => {
  const qs = bank.levels.flatMap((l) => l.questions);
  assert.equal(new Set(qs.map((q) => q.id)).size, 30);
  assert.equal(new Set(qs.map((q) => q.prompt.toLowerCase())).size, 30);
});

test('validateQuizBank finds no errors against the dataset', () => {
  const r = validateQuizBank(bank, d.species, Object.fromEntries(Object.entries(d.enrichment.threatTags).map(([k, v]) => [k, v.label])));
  assert.deepEqual(r.errors, []);
  assert.equal(r.stats.questions, 30);
  assert.equal(r.stats.machineChecked + r.stats.curated, 30);
});

test('quiz label fallback matches the dataset threat labels', () => {
  const real = Object.fromEntries(Object.entries(d.enrichment.threatTags).map(([k, v]) => [k, v.label]));
  assert.deepEqual(THREAT_LABELS_FALLBACK, real);
});

test('option species exist and labels equal species names', () => {
  const by = Object.fromEntries(d.species.map((s) => [s.slug, s]));
  bank.levels.flatMap((l) => l.questions).forEach((q) => q.options.filter((o) => o.slug).forEach((o) => assert.equal(by[o.slug]?.name, o.label, q.id)));
});

test('no question depends on population figures or asks the player to guess a location', () => {
  bank.levels.flatMap((l) => l.questions).forEach((q) => {
    assert.ok(!/population|how many|your location|where are you|click|which country/i.test(q.prompt), q.id);
  });
});

test('validator rejects a tampered bank (wrong key, duplicate option, 5 options, 4 questions)', () => {
  const clone = () => JSON.parse(JSON.stringify(bank));
  let b = clone(); b.levels[0].questions[1].answer = 0;
  assert.ok(validateQuizBank(b, d.species).errors.length > 0);
  b = clone(); b.levels[1].questions[0].options[0].label = b.levels[1].questions[0].options[1].label;
  assert.ok(validateQuizBank(b, d.species).errors.some((e) => e.includes('duplicate option labels')));
  b = clone(); b.levels[2].questions[0].options.push({ label: 'Extra' });
  assert.ok(validateQuizBank(b, d.species).errors.some((e) => e.includes('exactly 4 options')));
  b = clone(); b.levels[3].questions.pop();
  assert.ok(validateQuizBank(b, d.species).errors.some((e) => e.includes('expected 5 questions')));
  b = clone(); b.levels[4].questions[0].subject = 'ghost';
  assert.ok(validateQuizBank(b, d.species).errors.some((e) => e.includes('unknown subject')));
});
