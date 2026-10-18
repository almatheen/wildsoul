'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import SpeciesImage from '../ui/SpeciesImage';
import StatusBadge from '../ui/StatusBadge';
import HabitatMap from '../science/HabitatMap';
import PopulationChart from '../science/PopulationChart';
import AudioDemo from '../science/AudioDemo';
import { stopAnimalSound } from '../../lib/soundSynth';

const TABS = [['overview', 'Overview'], ['habitat', 'Habitat'], ['population', 'Population'], ['listen', 'Listen']];

/**
 * One stop of the expedition. Everything here is freely readable. The optional quiz lives in the Challenge.
 * `species` is the full record; `all` is the card list for previous/next.
 * Closing (button, Escape or backdrop) returns focus to the stop that opened it, which <dialog> does natively.
 */
export default function StopDialog({ species, all, onClose, onVisit, onGo }) {
  const ref = useRef(null);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    const d = ref.current;
    if (!d) return undefined;
    if (species && !d.open) d.showModal();
    if (!species && d.open) d.close();
    const onCancelOrClose = () => { stopAnimalSound(); onClose(); };
    d.addEventListener('close', onCancelOrClose);
    return () => d.removeEventListener('close', onCancelOrClose);
  }, [species, onClose]);

  useEffect(() => {
    if (!species) return;
    setTab('overview');
    onVisit(species.slug);
    ref.current?.scrollTo({ top: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [species?.slug]);

  const idx = species ? all.findIndex((c) => c.slug === species.slug) : -1;
  const prev = idx > 0 ? all[idx - 1] : null;
  const next = idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null;

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-label={species ? `Expedition stop ${species.level}: ${species.name}` : 'Expedition stop'}
      onClick={(e) => { if (e.target === ref.current) ref.current.close(); }}
    >
      {species && (
        <div>
          <button type="button" onClick={() => ref.current.close()} aria-label="Close stop" className="fixed right-4 top-4 z-20 grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-forest/70 text-xl backdrop-blur transition hover:bg-lime hover:text-forest">×</button>
          <div className="relative h-[clamp(240px,38vh,360px)] shade-b">
            <SpeciesImage species={species} priority />
            <div className="absolute inset-x-0 bottom-0 z-10 p-6 sm:p-9">
              <span className="text-[.64rem] uppercase tracking-[.22em] text-muted">Stop {species.level} of {all.length}</span>
              <h2 className="serif mt-2 text-[clamp(2.2rem,6vw,3.6rem)]">{species.name}</h2>
              <p className="sci text-muted">{species.scientificName}</p>
            </div>
          </div>

          <div className="px-6 pb-14 sm:px-9">
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <StatusBadge code={species.status.code} label={species.status.label} />
              <Link href={`/species/${species.slug}`} className="link-u ml-auto text-muted">Open full profile →</Link>
            </div>

            <div role="tablist" aria-label="Stop sections" className="mt-6 flex flex-wrap gap-2">
              {TABS.map(([k, l]) => (
                <button key={k} role="tab" id={`tab-${k}`} aria-selected={tab === k} aria-controls={`panel-${k}`} type="button" className="chip" onClick={() => setTab(k)}>{l}</button>
              ))}
            </div>

            <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="mt-7">
              {tab === 'overview' && (
                <div className="space-y-5">
                  <p className="serif text-[1.6rem] leading-[1.2]">{species.tagline}</p>
                  <p className="text-muted"><strong className="font-medium text-ivory">Ecological role. </strong>{species.ecologicalRole}</p>
                  <p className="text-muted"><strong className="font-medium text-ivory">Region. </strong>{species.region}</p>
                  <div>
                    <h3 className="mb-2 text-[.7rem] uppercase tracking-[.2em] text-lime">Threats (project dataset)</h3>
                    <ul className="space-y-2 text-[.92rem] text-muted">{species.threats.map((t) => <li key={t}>• {t}</li>)}</ul>
                  </div>
                </div>
              )}
              {tab === 'habitat' && (
                <HabitatMap
                  key={species.slug}
                  markers={[{ slug: species.slug, name: species.name, lat: species.geo.lat, lng: species.geo.lng, zoom: species.geo.zoom, locName: species.geo.locName, precision: species.geo.precision }]}
                  currentSlug={species.slug}
                  height={320}
                />
              )}
              {tab === 'population' && <PopulationChart species={species} />}
              {tab === 'listen' && <AudioDemo species={species} />}
            </div>

            <p className="mt-8 text-[.85rem] text-muted">
              Want to test yourself? The optional <Link href="/explore?view=challenge" className="link-u">wildlife challenge</Link> has six levels of five questions.
            </p>

            <div className="mt-12 flex flex-wrap justify-between gap-4 border-t border-white/10 pt-6">
              {prev ? <button type="button" className="btn" onClick={() => onGo(prev.slug)}><span aria-hidden="true">←</span> {prev.name}</button> : <span />}
              {next && <button type="button" className="btn" onClick={() => onGo(next.slug)}>{next.name} <span className="arr" aria-hidden="true">→</span></button>}
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
}
