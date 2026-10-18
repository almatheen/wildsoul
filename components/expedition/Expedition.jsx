'use client';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import gsap from 'gsap';
import SpeciesImage from '../ui/SpeciesImage';
import StatusBadge from '../ui/StatusBadge';
import StopDialog from './StopDialog';
import Challenge from './Challenge';
import { useProgress } from '../../lib/useProgress';

const OFFSETS = ['md:translate-x-0', 'md:translate-x-20', 'md:translate-x-0', 'md:-translate-x-20'];

/**
 * The expedition has two optional parts:
 *   Trail      every stop is always open. Visited marks are stored only in this browser.
 *   Challenge  six levels of five questions. Levels unlock in order, but only inside the challenge.
 * `stops` are full species records (server-provided); `cards` the light projection; `facts` feed the quiz feedback.
 */
export default function Expedition({ stops, cards, facts }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const slugs = useMemo(() => stops.map((s) => s.slug), [stops]);
  const progress = useProgress(slugs);
  const { state, dispatch } = progress;
  const trail = useRef(null);
  const view = sp.get('view') === 'challenge' ? 'challenge' : 'trail';
  const slug = view === 'trail' ? sp.get('stop') : null;
  const current = stops.find((s) => s.slug === slug) || null;

  const open = (s) => router.push(`${pathname}?stop=${s}`, { scroll: false });
  const close = useCallback(() => router.push(pathname, { scroll: false }), [router, pathname]);
  const onVisit = useCallback((s) => dispatch({ type: 'VISIT', slug: s }), [dispatch]);
  const go = (s) => router.replace(`${pathname}?stop=${s}`, { scroll: false });

  useEffect(() => {
    if (view !== 'trail' || !trail.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const ctx = gsap.context(() => {
      gsap.fromTo(trail.current.querySelectorAll('[data-stop]'), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.03, ease: 'power3.out', clearProps: 'all' });
    }, trail);
    return () => ctx.revert();
  }, [view]);

  const seen = state.visited.length;
  const reset = () => { if (window.confirm('Clear your saved expedition progress on this device? This removes visited stops and all challenge answers.')) dispatch({ type: 'CLEAR_ALL' }); };
  const stopState = (s) => (state.visited.includes(s.slug) ? 'visited' : 'new');
  const ring = { visited: 'border-lime', new: 'border-white/20' };
  const label = { visited: 'visited', new: 'not visited yet' };

  const tab = (v, text) => (
    <Link
      href={v === 'trail' ? pathname : `${pathname}?view=challenge`}
      scroll={false}
      replace
      aria-current={view === v ? 'page' : undefined}
      className={`chip ${view === v ? 'is-active' : ''}`}
      style={view === v ? { background: '#D4FF72', color: '#0B1511', borderColor: '#D4FF72' } : undefined}
    >{text}</Link>
  );

  return (
    <div>
      <nav aria-label="Expedition sections" className="mb-8 flex flex-wrap gap-2">
        {tab('trail', 'Trail')}
        {tab('challenge', 'Challenge')}
      </nav>

      {view === 'challenge' ? (
        <Challenge progress={progress} facts={facts} />
      ) : (
        <>
          <div className="mb-14 flex flex-wrap items-center justify-between gap-4 border-y border-white/10 py-5">
            <p className="text-[.9rem] text-muted" role="status">
              <b className="font-medium text-lime">{seen}</b> of {stops.length} stops visited
              <span className="ml-2 text-botanical">(saved on this device only)</span>
            </p>
            <button type="button" onClick={reset} className="chip">Clear progress</button>
          </div>

          <ol ref={trail} className="mx-auto flex max-w-[640px] flex-col items-stretch gap-4 md:items-center md:gap-14">
            {stops.map((s, i) => {
              const st = stopState(s);
              return (
                <li key={s.slug} data-stop className={`${OFFSETS[i % 4]} w-full md:w-auto`}>
                  <button
                    type="button"
                    onClick={() => open(s.slug)}
                    aria-label={`Stop ${s.level}: ${s.name}, ${s.status.label}, ${label[st]}`}
                    className="group flex w-full items-center gap-5 rounded-2xl border border-white/10 p-3 text-left transition hover:border-lime/50 md:w-auto md:flex-col md:border-0 md:p-0 md:text-center"
                  >
                    <span className={`relative block h-20 w-20 shrink-0 overflow-hidden rounded-full border-[3px] transition duration-500 group-hover:scale-105 md:h-28 md:w-28 ${ring[st]}`}>
                      <SpeciesImage species={cards[i]} />
                    </span>
                    <span className="md:mt-3">
                      <span className="block text-[.62rem] uppercase tracking-[.2em] text-botanical">Stop {s.level} · {s.group}</span>
                      <span className="block font-serif text-[1.3rem] font-light leading-tight">{s.name}</span>
                      <span className="mt-1 hidden md:inline-block"><StatusBadge code={s.status.code} label={s.status.code} /></span>
                      <span className="mt-1 block md:hidden"><StatusBadge code={s.status.code} label={s.status.label} /></span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </>
      )}

      <StopDialog species={current} all={cards} onClose={close} onVisit={onVisit} onGo={go} />
    </div>
  );
}
