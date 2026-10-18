import test from 'node:test';
import assert from 'node:assert/strict';
import { load, memoryStorage } from './helpers.mjs';
import bank from '../lib/quiz/bank.mjs';
import {
  makeReducer, initialState, isUnlocked, levelScore, summarise, reviewList, loadProgress, saveProgress,
  STORAGE_KEY, OLD_STORAGE_KEY, BACKUP_KEY, LEGACY_LEVEL_SLUGS, serialize,
} from '../lib/quiz/progress.mjs';

const d = load();
const reducer = makeReducer(bank);
const valid = new Set(d.species.map((s) => s.slug));
const base = () => ({ ...initialState(), hydrated: true });

function playLevel(state, level, pickWrongFor = []) {
  let s = reducer(state, { type: 'START_LEVEL', level });
  for (const q of bank.levels[level - 1].questions) {
    const choice = pickWrongFor.includes(q.id) ? (q.answer + 1) % 4 : q.answer;
    s = reducer(s, { type: 'ANSWER', qid: q.id, choice });
  }
  return reducer(s, { type: 'FINISH_LEVEL', level });
}

test('level 1 is open at the start, later levels are locked', () => {
  const s = base();
  assert.ok(isUnlocked(s, 1));
  for (let l = 2; l <= 6; l++) assert.ok(!isUnlocked(s, l));
});

test('locked levels cannot be started', () => {
  const s = reducer(base(), { type: 'START_LEVEL', level: 3 });
  assert.equal(s.draft, null);
});

test('completing a level unlocks the next one and records the score out of five', () => {
  let s = playLevel(base(), 1, ['L1Q2']);
  assert.deepEqual(s.completed, [1]);
  assert.ok(isUnlocked(s, 2));
  assert.deepEqual(levelScore(bank, s.answers, 1), { correct: 4, answered: 5, total: 5 });
  assert.equal(s.draft, null);
});

test('a question can be answered only once (no double scoring)', () => {
  let s = reducer(base(), { type: 'START_LEVEL', level: 1 });
  const q = bank.levels[0].questions[0];
  s = reducer(s, { type: 'ANSWER', qid: q.id, choice: (q.answer + 1) % 4 });
  const again = reducer(s, { type: 'ANSWER', qid: q.id, choice: q.answer });
  assert.equal(again, s);
  assert.equal(again.draft.answers[q.id], (q.answer + 1) % 4);
});

test('answers for another level, bad choices and unknown ids are ignored', () => {
  let s = reducer(base(), { type: 'START_LEVEL', level: 1 });
  assert.equal(reducer(s, { type: 'ANSWER', qid: 'L2Q1', choice: 0 }), s);
  assert.equal(reducer(s, { type: 'ANSWER', qid: 'L1Q1', choice: 7 }), s);
  assert.equal(reducer(s, { type: 'ANSWER', qid: 'L1Q1', choice: 1.5 }), s);
  assert.equal(reducer(s, { type: 'ANSWER', qid: 'nope', choice: 0 }), s);
  assert.equal(reducer(base(), { type: 'ANSWER', qid: 'L1Q1', choice: 0 }).draft, null);
});

test('a level cannot be finished until all five questions are answered', () => {
  let s = reducer(base(), { type: 'START_LEVEL', level: 1 });
  s = reducer(s, { type: 'ANSWER', qid: 'L1Q1', choice: 0 });
  assert.equal(reducer(s, { type: 'FINISH_LEVEL', level: 1 }), s);
});

test('replaying a level keeps the old result until the replay is finished, then replaces it', () => {
  let s = playLevel(base(), 1, ['L1Q1', 'L1Q2']);
  assert.equal(levelScore(bank, s.answers, 1).correct, 3);
  s = reducer(s, { type: 'REPLAY_LEVEL', level: 1 });
  assert.ok(s.completed.includes(1), 'still completed while replaying');
  assert.equal(levelScore(bank, s.answers, 1).correct, 3, 'old score kept');
  for (const q of bank.levels[0].questions) s = reducer(s, { type: 'ANSWER', qid: q.id, choice: q.answer });
  s = reducer(s, { type: 'FINISH_LEVEL', level: 1 });
  assert.equal(levelScore(bank, s.answers, 1).correct, 5);
});

test('full run: cumulative score, final results out of 30 and a 30-row review', () => {
  let s = base();
  for (let l = 1; l <= 6; l++) s = playLevel(s, l, l === 3 ? ['L3Q1'] : []);
  const sum = summarise(bank, s);
  assert.equal(sum.totalQuestions, 30);
  assert.equal(sum.correct, 29);
  assert.equal(sum.incorrect, 1);
  assert.ok(sum.allDone);
  assert.deepEqual(sum.perLevel.map((p) => p.correct), [5, 5, 4, 5, 5, 5]);
  const review = reviewList(bank, s);
  assert.equal(review.length, 30);
  assert.equal(review.filter((r) => !r.correct).length, 1);
});

test('restart clears quiz progress but keeps visited stops; clear all removes everything', () => {
  let s = playLevel(base(), 1);
  s = reducer(s, { type: 'VISIT', slug: 'kakapo' });
  s = reducer(s, { type: 'RESTART_CHALLENGE' });
  assert.deepEqual(s.completed, []);
  assert.deepEqual(s.answers, {});
  assert.deepEqual(s.visited, ['kakapo']);
  assert.ok(!isUnlocked(s, 2));
  s = reducer(s, { type: 'CLEAR_ALL' });
  assert.deepEqual(s.visited, []);
});

test('VISIT is idempotent', () => {
  let s = reducer(base(), { type: 'VISIT', slug: 'saola' });
  const again = reducer(s, { type: 'VISIT', slug: 'saola' });
  assert.equal(again, s);
});

test('save then load round-trips', () => {
  const st = memoryStorage();
  let s = playLevel(base(), 1);
  s = reducer(s, { type: 'VISIT', slug: 'axolotl' });
  assert.ok(saveProgress(st, s));
  const { state, status } = loadProgress(st, bank, valid);
  assert.equal(status, 'loaded');
  assert.deepEqual(state.completed, [1]);
  assert.deepEqual(state.visited, ['axolotl']);
  assert.deepEqual(state.answers, s.answers);
});

test('an in-progress level (draft) survives a reload and resumes', () => {
  const st = memoryStorage();
  let s = reducer(base(), { type: 'START_LEVEL', level: 1 });
  s = reducer(s, { type: 'ANSWER', qid: 'L1Q1', choice: 2 });
  saveProgress(st, s);
  const { state } = loadProgress(st, bank, valid);
  assert.deepEqual(state.draft, { level: 1, answers: { L1Q1: 2 } });
  const resumed = reducer(state, { type: 'START_LEVEL', level: 1 });
  assert.equal(resumed, state);
});

test('empty storage gives an empty state', () => {
  const { state, status } = loadProgress(memoryStorage(), bank, valid);
  assert.equal(status, 'empty');
  assert.deepEqual(state.completed, []);
});

test('malformed JSON starts fresh and keeps a backup copy of the raw text', () => {
  const st = memoryStorage({ [STORAGE_KEY]: '{not json' });
  const { state, status } = loadProgress(st, bank, valid);
  assert.equal(status, 'corrupt');
  assert.deepEqual(state.completed, []);
  assert.equal(st.getItem(BACKUP_KEY), '{not json');
});

test('a newer schema version or the wrong shape is treated as corrupt, not silently reused', () => {
  for (const raw of [JSON.stringify({ version: 99, completed: [1] }), '[]', '"x"', 'null', '42']) {
    const st = memoryStorage({ [STORAGE_KEY]: raw });
    const { state, status } = loadProgress(st, bank, valid);
    assert.equal(status, 'corrupt', raw);
    assert.deepEqual(state.completed, []);
    assert.equal(st.getItem(BACKUP_KEY), raw);
  }
});

test('invalid parts are dropped individually, valid parts kept', () => {
  const raw = JSON.stringify({
    version: 2,
    visited: ['kakapo', 'ghost', 5, 'kakapo'],
    answers: { L1Q1: 1, L1Q2: 9, L1Q3: 'a', nope: 0, L1Q4: 2, L1Q5: 0 },
    completed: [1, 2, 7, 'x'],
    draft: null,
  });
  const { state } = loadProgress(memoryStorage({ [STORAGE_KEY]: raw }), bank, valid);
  assert.deepEqual(state.visited, ['kakapo']);
  assert.deepEqual(state.answers, { L1Q1: 1, L1Q4: 2, L1Q5: 0 });
  assert.deepEqual(state.completed, [], 'level 1 lacks answers for L1Q2 and L1Q3, level 2 has none');
});

test('a level cannot be marked complete without unlocking the previous one', () => {
  const answers = Object.fromEntries(bank.levels[2].questions.map((q) => [q.id, q.answer]));
  const raw = JSON.stringify({ version: 2, visited: [], answers, completed: [3], draft: null });
  const { state } = loadProgress(memoryStorage({ [STORAGE_KEY]: raw }), bank, valid);
  assert.deepEqual(state.completed, []);
});

test('v4 progress is migrated: stop levels become visited slugs, completed stops count as visited, old key untouched', () => {
  const old = JSON.stringify({ completedLevels: [4], visitedLevels: [1, 2, 4, 99] });
  const st = memoryStorage({ [OLD_STORAGE_KEY]: old });
  const { state, status } = loadProgress(st, bank, valid);
  assert.equal(status, 'migrated');
  assert.deepEqual(state.visited.sort(), ['amur-leopard', 'kakapo', 'vaquita'].sort());
  assert.deepEqual(state.completed, []);
  assert.equal(st.getItem(OLD_STORAGE_KEY), old);
});

test('v4 migration drops species that are no longer in the catalogue (archived)', () => {
  const old = JSON.stringify({ visitedLevels: [7, 14, 1] }); // bengal-tiger, sumatran-orangutan, amur-leopard
  const { state } = loadProgress(memoryStorage({ [OLD_STORAGE_KEY]: old }), bank, valid);
  assert.deepEqual(state.visited, ['amur-leopard']);
});

test('malformed v4 data is ignored without throwing', () => {
  const { state, status } = loadProgress(memoryStorage({ [OLD_STORAGE_KEY]: 'garbage' }), bank, valid);
  assert.equal(status, 'empty');
  assert.deepEqual(state.visited, []);
});

test('legacy level table matches the original dataset order', () => {
  assert.deepEqual(LEGACY_LEVEL_SLUGS, d.legacy.species.slice().sort((a, b) => a.level - b.level).map((s) => s.id));
});

test('unavailable storage never throws', () => {
  const broken = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  assert.equal(loadProgress(broken, bank, valid).status, 'empty');
  assert.equal(saveProgress(broken, base()), false);
});

test('serialize writes the versioned schema', () => {
  assert.equal(JSON.parse(serialize(base())).version, 2);
});
