'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import gsap from 'gsap';
import SpeciesCard from './SpeciesCard';
import { HABITAT_LABELS } from '../../lib/relationLabels';

const STATUS_OPTS = [['CR', 'Critically Endangered'], ['EN', 'Endangered'], ['VU', 'Vulnerable']];
const SORTS = {
  name: ['Name, A to Z', (a, b) => a.name.localeCompare(b.name)],
  threat: ['Most threatened first', (a, b) => b.statusRank - a.statusRank || a.name.localeCompare(b.name)],
  group: ['Animal group', (a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name)],
  trail: ['Expedition order', (a, b) => a.level - b.level],
};
const RATIOS = ['aspect-[4/4.6]', 'aspect-[4/5.4]', 'aspect-[4/4.6]'];

export default function SpeciesAtlas({ cards }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const gridRef = useRef(null);

  const [q, setQ] = useState(sp.get('q') || '');
  const [status, setStatus] = useState(sp.get('status') || '');
  const [group, setGroup] = useState(sp.get('group') || '');
  const [habitat, setHabitat] = useState(sp.get('habitat') || '');
  const [sort, setSort] = useState(sp.get('sort') in SORTS ? sp.get('sort') : 'name');
  const [panel, setPanel] = useState(false);

  const groups = useMemo(() => [...new Set(cards.map((c) => c.group))].sort(), [cards]);
  const habitats = useMemo(() => [...new Set(cards.flatMap((c) => c.habitatTags))].sort((a, b) => HABITAT_LABELS[a].localeCompare(HABITAT_LABELS[b])), [cards]);

  // keep the URL shareable
  useEffect(() => {
    const t = setTimeout(() => {
      const p = new URLSearchParams();
      if (q) p.set('q', q);
      if (status) p.set('status', status);
      if (group) p.set('group', group);
      if (habitat) p.set('habitat', habitat);
      if (sort !== 'name') p.set('sort', sort);
      const qs = p.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 250);
    return () => clearTimeout(t);
  }, [q, status, group, habitat, sort, pathname, router]);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return cards
      .filter((c) =>
        (!status || c.statusCode === status) &&
        (!group || c.group === group) &&
        (!habitat || c.habitatTags.includes(habitat)) &&
        (!needle || `${c.name} ${c.scientificName} ${c.family} ${c.region}`.toLowerCase().includes(needle))
      )
      .sort(SORTS[sort][1]);
  }, [cards, q, status, group, habitat, sort]);

  // staggered entrance whenever the result set changes
  const key = results.map((r) => r.slug).join('|');
  useEffect(() => {
    if (!gridRef.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const ctx = gsap.context(() => {
      gsap.fromTo(gridRef.current.children, { opacity: 0, y: 36 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.06, ease: 'power3.out', clearProps: 'transform' });
    }, gridRef);
    return () => ctx.revert();
  }, [key]);

  const active = [
    q && ['q', `Search: “${q}”`, () => setQ('')],
    status && ['s', STATUS_OPTS.find(([c]) => c === status)?.[1], () => setStatus('')],
    group && ['g', group, () => setGroup('')],
    habitat && ['h', HABITAT_LABELS[habitat], () => setHabitat('')],
  ].filter(Boolean);
  const reset = () => { setQ(''); setStatus(''); setGroup(''); setHabitat(''); setSort('name'); };

  return (
    <div>
      <div className="mb-8 border-b border-white/10 pb-7">
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative min-w-[240px] max-w-[400px] flex-1">
            <span className="sr-only">Search by common or scientific name</span>
            <svg className="pointer-events-none absolute left-[18px] top-1/2 h-4 w-4 -translate-y-1/2 stroke-botanical" viewBox="0 0 20 20" fill="none" strokeWidth="1.6" aria-hidden="true"><circle cx="9" cy="9" r="6" /><path d="M14 14l4 4" /></svg>
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search common or scientific name" autoComplete="off" className="field pl-[46px]" />
          </label>
          <button type="button" className="chip md:hidden" aria-expanded={panel} aria-controls="atlas-filters" onClick={() => setPanel((p) => !p)}>
            Filters{active.length ? ` (${active.length})` : ''}
          </button>
          <label className="ml-auto flex items-center gap-3 text-[.78rem] text-muted">
            <span>Sort</span>
            <select className="field w-auto py-2.5" value={sort} onChange={(e) => setSort(e.target.value)}>
              {Object.entries(SORTS).map(([k, [label]]) => <option key={k} value={k}>{label}</option>)}
            </select>
          </label>
        </div>

        <div id="atlas-filters" className={`${panel ? 'block' : 'hidden'} mt-5 grid gap-5 md:grid`}>
          <fieldset>
            <legend className="mb-2 text-[.66rem] uppercase tracking-[.2em] text-botanical">Conservation status</legend>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="chip" aria-pressed={!status} onClick={() => setStatus('')}>Any</button>
              {STATUS_OPTS.map(([c, l]) => <button key={c} type="button" className="chip" aria-pressed={status === c} onClick={() => setStatus(status === c ? '' : c)}>{l}</button>)}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-[.66rem] uppercase tracking-[.2em] text-botanical">Animal group</legend>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="chip" aria-pressed={!group} onClick={() => setGroup('')}>All</button>
              {groups.map((g) => <button key={g} type="button" className="chip" aria-pressed={group === g} onClick={() => setGroup(group === g ? '' : g)}>{g}</button>)}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-[.66rem] uppercase tracking-[.2em] text-botanical">Habitat type</legend>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="chip" aria-pressed={!habitat} onClick={() => setHabitat('')}>Any</button>
              {habitats.map((h) => <button key={h} type="button" className="chip" aria-pressed={habitat === h} onClick={() => setHabitat(habitat === h ? '' : h)}>{HABITAT_LABELS[h]}</button>)}
            </div>
          </fieldset>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2" aria-live="polite">
          <span className="mr-2 text-[.78rem] tracking-wide text-muted"><b className="font-medium text-lime">{results.length}</b> of {cards.length} species</span>
          {active.map(([k, label, clear]) => (
            <button key={k} type="button" onClick={clear} className="chip flex items-center gap-2" aria-label={`Remove filter ${label}`}>
              {label} <span aria-hidden="true">×</span>
            </button>
          ))}
          {(active.length > 0 || sort !== 'name') && <button type="button" onClick={reset} className="link-u ml-1 text-muted">Reset filters</button>}
        </div>
      </div>

      {results.length > 0 ? (
        <div ref={gridRef} className="grid items-start gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((c, i) => <SpeciesCard key={c.slug} s={c} ratio={RATIOS[i % 3]} />)}
        </div>
      ) : (
        <div className="py-24 text-center" role="status">
          <h2 className="font-serif text-[2.2rem] font-light">No species match.</h2>
          <p className="mt-2 text-muted">Try a different name, or clear some filters.</p>
          <button type="button" onClick={reset} className="btn btn-fill mt-6">Reset filters</button>
        </div>
      )}
    </div>
  );
}
