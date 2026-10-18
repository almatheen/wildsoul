'use client';
import { useEffect, useMemo, useReducer, useState } from 'react';
import bank from './quiz/bank.mjs';
import { makeReducer, initialState, loadProgress, saveProgress } from './quiz/progress.mjs';

const reducer = makeReducer(bank);

/**
 * Local progress for the expedition trail and the challenge.
 * Reads on mount (so server and client render the same first frame), saves on every change after that.
 * `status` reports what happened on load: 'empty' | 'loaded' | 'migrated' | 'corrupt'.
 */
export function useProgress(slugs) {
  const validSlugs = useMemo(() => new Set(slugs), [slugs]);
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [status, setStatus] = useState('empty');

  useEffect(() => {
    let storage = null;
    try { storage = window.localStorage; } catch { storage = null; }
    if (!storage) { dispatch({ type: 'HYDRATE', state: { ...initialState(), hydrated: true } }); return; }
    const { state: loaded, status: st } = loadProgress(storage, bank, validSlugs);
    setStatus(st);
    dispatch({ type: 'HYDRATE', state: loaded });
  }, [validSlugs]);

  useEffect(() => {
    if (!state.hydrated) return;
    try { saveProgress(window.localStorage, state); } catch { /* storage unavailable: progress lasts for this visit only */ }
  }, [state]);

  return { state, dispatch, status, bank };
}
