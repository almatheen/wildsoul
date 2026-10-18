/**
 * Pure progress logic for the expedition and the six-level challenge. No React, no browser APIs
 * except where a `storage` object is passed in, so it can be unit-tested with Node.
 *
 * Storage
 *   key  wildsoul_progress_v2   { version: 2, visited: [slug], answers: {qid: 0-3}, completed: [1-6], draft: {level, answers} | null }
 *   old  wildsoul_v4_progress   { completedLevels: [n], visitedLevels: [n] }  (read once and migrated, never modified)
 *   bak  wildsoul_progress_corrupt  raw text of saved data that could not be read, kept once so nothing is silently lost
 *
 * Behaviour on bad data (documented in the README):
 *   - invalid JSON, wrong shape or a newer schema version: the raw text is copied to the backup key,
 *     progress starts empty, and the next save writes a fresh v2 record.
 *   - unknown question ids, species slugs, out-of-range answers or levels are dropped individually.
 */
export const STORAGE_KEY = 'wildsoul_progress_v2';
export const OLD_STORAGE_KEY = 'wildsoul_v4_progress';
export const BACKUP_KEY = 'wildsoul_progress_corrupt';
export const SCHEMA_VERSION = 2;

/** v4 stored species "levels" 1..15. This is the original order from data/species-dataset.json. */
export const LEGACY_LEVEL_SLUGS = [
  'amur-leopard', 'vaquita', 'javan-rhino', 'kakapo', 'mountain-gorilla', 'hawksbill-turtle', 'bengal-tiger',
  'philippine-eagle', 'blue-whale', 'saola', 'axolotl', 'california-condor', 'red-panda', 'sumatran-orangutan', 'snow-leopard',
];

export const initialState = () => ({ version: SCHEMA_VERSION, visited: [], answers: {}, completed: [], draft: null, hydrated: false });

const uniq = (a) => [...new Set(a)];
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

export function indexBank(bank) {
  const questions = {};
  const levelOf = {};
  bank.levels.forEach((lv) => lv.questions.forEach((q) => { questions[q.id] = q; levelOf[q.id] = lv.level; }));
  return { questions, levelOf, levels: bank.levels.length };
}

/** Make any parsed value into a valid state (dropping what does not fit). */
export function sanitize(raw, bank, validSlugs) {
  const idx = indexBank(bank);
  const slugOk = (s) => typeof s === 'string' && (!validSlugs || validSlugs.has(s));
  const out = initialState();
  if (!isObj(raw)) return out;
  out.visited = uniq((Array.isArray(raw.visited) ? raw.visited : []).filter(slugOk));
  const cleanAnswers = (a) => {
    const r = {};
    if (!isObj(a)) return r;
    for (const [qid, choice] of Object.entries(a)) {
      if (idx.questions[qid] && Number.isInteger(choice) && choice >= 0 && choice <= 3) r[qid] = choice;
    }
    return r;
  };
  out.answers = cleanAnswers(raw.answers);
  // a level counts as completed only when every one of its questions has a committed answer
  out.completed = uniq((Array.isArray(raw.completed) ? raw.completed : []).filter((n) => Number.isInteger(n) && n >= 1 && n <= idx.levels))
    .filter((n) => bank.levels[n - 1].questions.every((q) => q.id in out.answers))
    .sort((a, b) => a - b);
  // a level can only be completed if the one before it is (no skipping)
  const chain = [];
  for (const n of out.completed) { if (n === 1 || chain.includes(n - 1)) chain.push(n); }
  out.completed = chain;
  if (isObj(raw.draft) && Number.isInteger(raw.draft.level) && raw.draft.level >= 1 && raw.draft.level <= idx.levels) {
    const lvl = raw.draft.level;
    const allowed = new Set(bank.levels[lvl - 1].questions.map((q) => q.id));
    const answers = Object.fromEntries(Object.entries(cleanAnswers(raw.draft.answers)).filter(([k]) => allowed.has(k)));
    if (isUnlocked({ completed: out.completed }, lvl)) out.draft = { level: lvl, answers };
  }
  return out;
}

/**
 * Read saved progress.
 * Returns { state, status } where status is one of:
 *   'empty' | 'loaded' | 'migrated' | 'corrupt'
 */
export function loadProgress(storage, bank, validSlugs) {
  const read = (k) => { try { return storage.getItem(k); } catch { return null; } };
  const write = (k, v) => { try { storage.setItem(k, v); } catch { /* storage unavailable */ } };
  const keepBackup = (raw) => { if (read(BACKUP_KEY) == null) write(BACKUP_KEY, raw); };

  const current = read(STORAGE_KEY);
  if (current != null) {
    let parsed;
    try { parsed = JSON.parse(current); } catch { keepBackup(current); return { state: { ...initialState(), hydrated: true }, status: 'corrupt' }; }
    if (!isObj(parsed) || parsed.version !== SCHEMA_VERSION) { keepBackup(current); return { state: { ...initialState(), hydrated: true }, status: 'corrupt' }; }
    return { state: { ...sanitize(parsed, bank, validSlugs), hydrated: true }, status: 'loaded' };
  }

  const old = read(OLD_STORAGE_KEY);
  if (old != null) {
    let parsed;
    try { parsed = JSON.parse(old); } catch { return { state: { ...initialState(), hydrated: true }, status: 'empty' }; }
    if (isObj(parsed)) {
      const toSlugs = (arr) => (Array.isArray(arr) ? arr : []).map((n) => LEGACY_LEVEL_SLUGS[n - 1]).filter(Boolean);
      const visited = uniq([...toSlugs(parsed.visitedLevels), ...toSlugs(parsed.completedLevels)]);
      const state = { ...sanitize({ visited }, bank, validSlugs), hydrated: true };
      return { state, status: 'migrated' };
    }
  }
  return { state: { ...initialState(), hydrated: true }, status: 'empty' };
}

export const serialize = (state) => JSON.stringify({
  version: SCHEMA_VERSION, visited: state.visited, answers: state.answers, completed: state.completed, draft: state.draft,
});

export function saveProgress(storage, state) {
  try { storage.setItem(STORAGE_KEY, serialize(state)); return true; } catch { return false; }
}

export const isUnlocked = (state, level) => level === 1 || state.completed.includes(level - 1);

export function makeReducer(bank) {
  const idx = indexBank(bank);
  return function reducer(state, action) {
    switch (action.type) {
      case 'HYDRATE':
        return action.state;
      case 'VISIT':
        return state.visited.includes(action.slug) ? state : { ...state, visited: [...state.visited, action.slug] };
      case 'START_LEVEL': {
        const { level } = action;
        if (!Number.isInteger(level) || level < 1 || level > idx.levels || !isUnlocked(state, level)) return state;
        if (state.draft?.level === level) return state; // resume
        return { ...state, draft: { level, answers: {} } };
      }
      case 'REPLAY_LEVEL': {
        const { level } = action;
        if (!Number.isInteger(level) || level < 1 || level > idx.levels || !isUnlocked(state, level)) return state;
        return { ...state, draft: { level, answers: {} } };
      }
      case 'ANSWER': {
        const { qid, choice } = action;
        const d = state.draft;
        if (!d || idx.levelOf[qid] !== d.level) return state;
        if (!Number.isInteger(choice) || choice < 0 || choice > 3) return state;
        if (qid in d.answers) return state; // one answer per question: prevents double scoring
        return { ...state, draft: { ...d, answers: { ...d.answers, [qid]: choice } } };
      }
      case 'FINISH_LEVEL': {
        const d = state.draft;
        if (!d || d.level !== action.level) return state;
        if (!bank.levels[d.level - 1].questions.every((q) => q.id in d.answers)) return state;
        return {
          ...state,
          answers: { ...state.answers, ...d.answers },
          completed: uniq([...state.completed, d.level]).sort((a, b) => a - b),
          draft: null,
        };
      }
      case 'RESTART_CHALLENGE':
        return { ...state, answers: {}, completed: [], draft: null };
      case 'CLEAR_ALL':
        return { ...initialState(), hydrated: true };
      default:
        return state;
    }
  };
}

// ------------------------------------------------------------------ scoring

export function levelScore(bank, answers, level) {
  const qs = bank.levels[level - 1].questions;
  const answered = qs.filter((q) => q.id in answers);
  return { correct: answered.filter((q) => answers[q.id] === q.answer).length, answered: answered.length, total: qs.length };
}

export function summarise(bank, state) {
  const perLevel = bank.levels.map((lv) => {
    const done = state.completed.includes(lv.level);
    const sc = levelScore(bank, state.answers, lv.level);
    return { level: lv.level, title: lv.title, completed: done, correct: done ? sc.correct : 0, total: sc.total };
  });
  const completedLevels = perLevel.filter((l) => l.completed);
  const correct = completedLevels.reduce((a, l) => a + l.correct, 0);
  const attempted = completedLevels.reduce((a, l) => a + l.total, 0);
  return {
    perLevel,
    correct,
    incorrect: attempted - correct,
    attempted,
    totalQuestions: bank.levels.reduce((a, l) => a + l.questions.length, 0),
    allDone: completedLevels.length === bank.levels.length,
  };
}

/** Review of every question in completed levels. */
export function reviewList(bank, state) {
  const rows = [];
  bank.levels.forEach((lv) => {
    if (!state.completed.includes(lv.level)) return;
    lv.questions.forEach((q) => rows.push({ level: lv.level, question: q, chosen: state.answers[q.id], correct: state.answers[q.id] === q.answer }));
  });
  return rows;
}
