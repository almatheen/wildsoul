'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { isUnlocked, levelScore, summarise, reviewList } from '../../lib/quiz/progress.mjs';
import { playWinSound } from '../../lib/soundSynth';

/** Module-level so React keeps one element (and its focus) across renders. */
function H({ hRef, children, className = '' }) {
  return <h2 ref={hRef} tabIndex={-1} className={`font-serif font-light outline-none ${className}`}>{children}</h2>;
}

/**
 * The six-level challenge. Optional: the trail and every profile stay open without it.
 * All question content comes from lib/quiz/bank.mjs; `facts` supplies species names, a one-line fact and source links.
 */
export default function Challenge({ progress, facts }) {
  const { state, dispatch, bank, status } = progress;
  const [screen, setScreen] = useState('levels'); // levels | play | summary | results
  const [level, setLevel] = useState(1);
  const [qIndex, setQIndex] = useState(0);
  const headingRef = useRef(null);
  const nextRef = useRef(null);

  const summary = useMemo(() => summarise(bank, state), [bank, state]);
  const lv = bank.levels[level - 1];
  const draft = state.draft && state.draft.level === level ? state.draft : null;

  // move focus to the new screen's heading so keyboard and screen-reader users land in the right place
  useEffect(() => { headingRef.current?.focus({ preventScroll: false }); }, [screen, level, qIndex]);

  const q = lv.questions[qIndex];
  const chosen = draft?.answers[q.id];
  const answered = chosen !== undefined;
  useEffect(() => { if (answered) nextRef.current?.focus(); }, [answered, qIndex]);

  const firstUnanswered = (l, answers) => {
    const i = bank.levels[l - 1].questions.findIndex((x) => !(x.id in answers));
    return i === -1 ? bank.levels[l - 1].questions.length - 1 : i;
  };

  const begin = (l, replay = false) => {
    const other = state.draft && state.draft.level !== l && Object.keys(state.draft.answers).length > 0;
    if (other && !window.confirm(`Level ${state.draft.level} is in progress. Starting level ${l} will discard those unfinished answers. Continue?`)) return;
    dispatch({ type: replay ? 'REPLAY_LEVEL' : 'START_LEVEL', level: l });
    setLevel(l);
    const existing = state.draft && state.draft.level === l && !replay ? state.draft.answers : {};
    setQIndex(firstUnanswered(l, existing));
    setScreen('play');
  };

  const choose = (idx) => {
    if (answered) return; // one answer per question
    dispatch({ type: 'ANSWER', qid: q.id, choice: idx });
    if (idx === q.answer) { try { playWinSound(); } catch { /* audio is optional */ } }
  };

  const next = () => {
    if (qIndex < lv.questions.length - 1) { setQIndex(qIndex + 1); return; }
    dispatch({ type: 'FINISH_LEVEL', level });
    setScreen('summary');
  };

  const restart = () => {
    if (window.confirm('Restart the whole challenge? Your scores and answers for all six levels will be cleared on this device. Your visited stops are kept.')) {
      dispatch({ type: 'RESTART_CHALLENGE' });
      setScreen('levels');
    }
  };

  const draftCorrect = draft ? lv.questions.filter((x) => draft.answers[x.id] === x.answer).length : 0;
  const total = summary.totalQuestions;

  // -------------------------------------------------------------- level list
  if (screen === 'levels') {
    return (
      <div>
        {status === 'corrupt' && (
          <p className="note-box mb-6" role="status">Saved progress on this device could not be read, so the challenge started fresh. A copy of the unreadable data was kept in this browser.</p>
        )}
        {status === 'migrated' && (
          <p className="note-box mb-6" role="status">Your visited stops from an earlier version were carried over. Quiz scores start fresh because this challenge is new.</p>
        )}
        <div className="flex flex-wrap items-end justify-between gap-5 border-b border-white/10 pb-6">
          <div>
            <H hRef={headingRef} className="text-[clamp(1.8rem,3.6vw,2.6rem)]">The wildlife challenge</H>
            <p className="mt-2 max-w-[620px] text-[.92rem] text-muted">Six levels, five questions each. Finish a level to unlock the next. It is entirely optional: the trail and every profile stay open whether or not you play.</p>
          </div>
          <p className="text-[.9rem] text-muted" role="status">
            Score so far <b className="font-medium text-lime">{summary.correct}</b> of {total}
            <span className="ml-2 text-botanical">({summary.perLevel.filter((l) => l.completed).length} of {bank.levels.length} levels complete)</span>
          </p>
        </div>

        <ol className="mt-8 grid gap-4 md:grid-cols-2">
          {bank.levels.map((l) => {
            const unlocked = isUnlocked(state, l.level);
            const done = state.completed.includes(l.level);
            const sc = summary.perLevel[l.level - 1];
            const inProgress = state.draft?.level === l.level;
            const answeredN = inProgress ? Object.keys(state.draft.answers).length : 0;
            return (
              <li key={l.level} className={`rounded-2xl border p-6 ${unlocked ? 'border-white/15' : 'border-white/10 opacity-70'}`}>
                <span className="text-[.64rem] uppercase tracking-[.22em] text-botanical">Level {l.level}</span>
                <h3 className="mt-1 font-serif text-[1.6rem] font-light leading-tight">{l.title}</h3>
                <p className="mt-1 text-[.85rem] text-lime/90">{l.theme}</p>
                <p className="mt-2 text-[.88rem] text-muted">{l.description}</p>
                <p className="mt-4 text-[.82rem]" role="status">
                  {done ? <>Completed: <b className="font-medium text-lime">{sc.correct}</b> of {sc.total} correct</>
                    : inProgress ? <>In progress: {answeredN} of {l.questions.length} answered</>
                    : unlocked ? 'Not started'
                    : <>Locked. Complete level {l.level - 1} to unlock.</>}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {unlocked && !done && <button type="button" className="btn btn-fill" onClick={() => begin(l.level)}>{inProgress ? 'Continue' : 'Start'} level {l.level}</button>}
                  {done && <button type="button" className="btn" onClick={() => begin(l.level, true)}>Replay level {l.level}</button>}
                  {!unlocked && <button type="button" className="chip" aria-disabled="true" onClick={(e) => e.preventDefault()}>Locked</button>}
                </div>
              </li>
            );
          })}
        </ol>

        <div className="mt-10 flex flex-wrap gap-3 border-t border-white/10 pt-6">
          {summary.perLevel.some((l) => l.completed) && (
            <button type="button" className={summary.allDone ? 'btn btn-fill' : 'btn'} onClick={() => setScreen('results')}>{summary.allDone ? 'See final results' : 'See results so far'}</button>
          )}
          {(summary.perLevel.some((l) => l.completed) || state.draft) && <button type="button" className="chip" onClick={restart}>Restart the challenge</button>}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------- playing
  if (screen === 'play') {
    const fact = facts[q.subject];
    const correct = answered && chosen === q.answer;
    const last = qIndex === lv.questions.length - 1;
    return (
      <div>
        <button type="button" className="chip mb-6" onClick={() => setScreen('levels')}>← All levels</button>
        <p className="text-[.66rem] uppercase tracking-[.22em] text-botanical">Level {level}: {lv.title} · Question {qIndex + 1} of {lv.questions.length}</p>
        <div className="mt-3 flex gap-2" aria-hidden="true">
          {lv.questions.map((x, i) => {
            const a = draft?.answers[x.id];
            return <i key={x.id} className={`h-1.5 flex-1 rounded-full ${a === undefined ? (i === qIndex ? 'bg-white/50' : 'bg-white/15') : a === x.answer ? 'bg-lime' : 'bg-status-cr'}`} />;
          })}
        </div>
        <p className="mt-2 text-[.78rem] text-muted">Level score so far: {draftCorrect} · Overall: {summary.correct + draftCorrect} of {total}</p>

        <H hRef={headingRef} className="mt-8 text-[clamp(1.5rem,3vw,2.2rem)] leading-[1.2]">{q.prompt}</H>

        <ul className="mt-7 grid gap-3" role="group" aria-label="Answer options">
          {q.options.map((o, i) => {
            const isKey = i === q.answer;
            const isPick = chosen === i;
            const style = !answered ? 'border-white/15 hover:border-lime focus-visible:border-lime'
              : isKey ? 'border-lime bg-lime/10'
              : isPick ? 'border-status-cr bg-status-cr/10'
              : 'border-white/10 opacity-60';
            return (
              <li key={o.label}>
                <button
                  type="button"
                  disabled={answered}
                  aria-disabled={answered}
                  onClick={() => choose(i)}
                  className={`flex w-full items-center justify-between gap-4 rounded-2xl border px-5 py-4 text-left transition ${style}`}
                >
                  <span className="font-serif text-[1.15rem] font-light">{o.label}</span>
                  {answered && (isKey || isPick) && (
                    <span className="shrink-0 text-[.7rem] uppercase tracking-[.14em]">{isKey ? '✓ Correct answer' : '✗ Your answer'}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <div role="status" aria-live="polite" className="mt-6">
          {answered && (
            <div className="rounded-2xl border border-white/10 p-6">
              <p className={`font-serif text-[1.5rem] font-light ${correct ? 'text-lime' : 'text-status-en'}`}>{correct ? 'Correct.' : 'Not quite.'}</p>
              {!correct && <p className="mt-2 text-[.95rem]">The correct answer is <b className="font-medium">{q.options[q.answer].label}</b>.</p>}
              <p className="mt-3 text-[.92rem] text-muted">{q.explanation}</p>
              {fact && (
                <p className="mt-4 text-[.88rem] text-muted"><b className="font-medium text-ivory">Species fact, {fact.name}:</b> {fact.tagline}</p>
              )}
              {fact && (
                <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[.82rem]">
                  <Link href={`/species/${q.subject}`} className="link-u">Read the {fact.name} profile</Link>
                  {fact.sources.map((s) => <a key={s.url} className="link-u text-muted" href={s.url} target="_blank" rel="noopener noreferrer">{s.label}</a>)}
                </p>
              )}
            </div>
          )}
        </div>

        {answered && (
          <button ref={nextRef} type="button" className="btn btn-fill mt-6" onClick={next}>
            {last ? 'Finish level' : 'Next question'} <span className="arr" aria-hidden="true">→</span>
          </button>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------- level summary
  if (screen === 'summary') {
    const sc = levelScore(bank, state.answers, level);
    const nextLevel = level < bank.levels.length ? level + 1 : null;
    return (
      <div>
        <p className="text-[.66rem] uppercase tracking-[.22em] text-botanical">Level {level}: {lv.title}</p>
        <H hRef={headingRef} className="mt-3 text-[clamp(2rem,4vw,3rem)]">Level complete</H>
        <p className="mt-4 font-serif text-[3rem] font-light leading-none text-lime">{sc.correct} <span className="text-[1.4rem] text-muted">of {sc.total}</span></p>
        <p className="mt-3 text-muted" role="status">Overall score: {summary.correct} of {total} after {summary.perLevel.filter((l) => l.completed).length} {summary.perLevel.filter((l) => l.completed).length === 1 ? 'level' : 'levels'}.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          {nextLevel ? <button type="button" className="btn btn-fill" onClick={() => begin(nextLevel)}>Next level: {bank.levels[nextLevel - 1].title} <span className="arr" aria-hidden="true">→</span></button>
            : <button type="button" className="btn btn-fill" onClick={() => setScreen('results')}>See final results <span className="arr" aria-hidden="true">→</span></button>}
          <button type="button" className="btn" onClick={() => begin(level, true)}>Replay this level</button>
          <button type="button" className="chip" onClick={() => setScreen('levels')}>All levels</button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------- results and review
  const review = reviewList(bank, state);
  return (
    <div>
      <button type="button" className="chip mb-6" onClick={() => setScreen('levels')}>← All levels</button>
      <H hRef={headingRef} className="text-[clamp(2rem,4vw,3rem)]">{summary.allDone ? 'Final results' : 'Results so far'}</H>
      <p className="mt-4 font-serif text-[3.4rem] font-light leading-none text-lime">{summary.correct} <span className="text-[1.5rem] text-muted">of {total}</span></p>
      <p className="mt-3 text-muted" role="status">{summary.correct} correct · {summary.incorrect} incorrect{!summary.allDone && ` · ${total - summary.attempted} questions not yet played`}</p>

      <table className="mt-6 w-full max-w-[560px] text-left text-[.9rem]">
        <caption className="sr-only">Score for each level</caption>
        <thead><tr className="text-muted"><th className="py-2 pr-4 font-normal">Level</th><th className="py-2 font-normal">Score</th></tr></thead>
        <tbody>
          {summary.perLevel.map((l) => (
            <tr key={l.level} className="border-t border-white/10">
              <td className="py-2 pr-4">{l.level}. {l.title}</td>
              <td className="py-2">{l.completed ? `${l.correct} of ${l.total}` : 'Not completed'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-8 flex flex-wrap gap-3">
        <button type="button" className="chip" onClick={restart}>Restart the challenge</button>
      </div>

      <h3 className="mt-12 font-serif text-[1.7rem] font-light">Review of {review.length} {review.length === 1 ? 'question' : 'questions'}</h3>
      <p className="mt-1 text-[.85rem] text-muted">Open any question to see your answer, the correct answer and the explanation. Source links go to the IUCN Red List search and Wikipedia; they were not opened when this version was built.</p>
      <ol className="mt-5 space-y-3">
        {review.map((r) => {
          const fact = facts[r.question.subject];
          return (
            <li key={r.question.id}>
              <details className="rounded-2xl border border-white/10 p-4">
                <summary className="cursor-pointer text-[.92rem]">
                  <span className={r.correct ? 'text-lime' : 'text-status-en'}>{r.correct ? '✓ Correct' : '✗ Incorrect'}</span>
                  <span className="ml-2 text-botanical">L{r.level}</span> {r.question.prompt}
                </summary>
                <div className="mt-3 space-y-2 text-[.88rem] text-muted">
                  <p>Your answer: <b className="font-medium text-ivory">{r.question.options[r.chosen]?.label ?? 'none'}</b></p>
                  <p>Correct answer: <b className="font-medium text-ivory">{r.question.options[r.question.answer].label}</b></p>
                  <p>{r.question.explanation}</p>
                  {fact && (
                    <p className="flex flex-wrap gap-x-5 gap-y-1">
                      <Link href={`/species/${r.question.subject}`} className="link-u">{fact.name} profile</Link>
                      {fact.sources.map((s) => <a key={s.url} className="link-u" href={s.url} target="_blank" rel="noopener noreferrer">{s.label}</a>)}
                    </p>
                  )}
                </div>
              </details>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
