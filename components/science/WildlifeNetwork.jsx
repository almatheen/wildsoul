'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import useSpeciesImageSrc from '../../lib/useSpeciesImageSrc';
import { HABITAT_LABELS, THREAT_LABELS } from '../../lib/relationLabels';

const W = 1100, H = 780, CX = 550, CY = 390;
const RX = 440, RY = 290;
const MAX_LINKS = 2; // each species draws at most this many links, its most specific ones

const MODES = {
  taxonomy: {
    label: 'Taxonomy',
    blurb: 'Each species links to the closest group of scientific relatives it shares with another species in view: genus, then family, then order, then class.',
    stroke: '#D4FF72', dash: undefined, centre: 'Shared ancestry',
  },
  habitat: {
    label: 'Habitat',
    blurb: 'Species that occur in the same broad habitat type. Sharing a habitat type does not mean sharing a location. Each species shows its two most specific habitat links.',
    stroke: '#9DC18F', dash: '7 5', centre: 'Shared habitat',
  },
  threat: {
    label: 'Threats',
    blurb: 'Species affected by the same kind of threat, as listed in the project dataset. Each species shows its two most specific threat links.',
    stroke: '#FF8A7E', dash: '2 5', centre: 'Shared threat',
  },
};

const STATUS_COLOR = { CR: '#FF6B5E', EN: '#FFB04D', VU: '#D4FF72' };
const TAX_RANKS = [['genus', 'Genus'], ['family', 'Family'], ['order', 'Order'], ['class', 'Class']];

/**
 * Work out hubs (the things species are linked through) for a set of species.
 * `cap` limits how many hubs each species keeps; Infinity keeps all (used by the text version).
 * Hubs with fewer than two members are dropped: a link needs two ends.
 */
export function computeHubs(mode, list, cap = MAX_LINKS) {
  const members = new Map(); // hub id -> { id, label, size, members: [slug] }
  const add = (id, label, slug) => {
    if (!members.has(id)) members.set(id, { id, label, members: [] });
    members.get(id).members.push(slug);
  };

  if (mode === 'taxonomy') {
    // one hub per species: the lowest rank it shares with someone else in view
    list.forEach((s) => {
      for (const [rank, word] of TAX_RANKS) {
        const value = s[rank];
        if (value && list.filter((o) => o[rank] === value).length >= 2) { add(`${rank}:${value}`, `${word} ${value}`, s.slug); break; }
      }
    });
  } else {
    const field = mode === 'habitat' ? 'habitatTags' : 'threatTags';
    const labels = mode === 'habitat' ? HABITAT_LABELS : THREAT_LABELS;
    const size = {};
    list.forEach((s) => s[field].forEach((t) => { size[t] = (size[t] || 0) + 1; }));
    list.forEach((s) => {
      s[field]
        .filter((t) => size[t] >= 2)
        .sort((a, b) => size[a] - size[b] || a.localeCompare(b))
        .slice(0, cap)
        .forEach((t) => add(t, labels[t], s.slug));
    });
    // capping can leave a hub with a single member
    for (const [id, h] of [...members]) if (h.members.length < 2) members.delete(id);
  }
  return [...members.values()].sort((a, b) => b.members.length - a.members.length || a.label.localeCompare(b.label));
}

/** Deterministic layout: species evenly round an outer ellipse, hubs sit at the mean angle of their members. */
function buildLayout(mode, list) {
  const hubList = computeHubs(mode, list);
  const hubIndex = Object.fromEntries(hubList.map((h, i) => [h.id, i]));
  const hubsOf = {};
  hubList.forEach((h) => h.members.forEach((m) => { (hubsOf[m] ||= []).push(h.id); }));

  const primary = (s) => (hubsOf[s.slug] || []).slice().sort((a, b) => hubIndex[a] - hubIndex[b])[0];
  const ordered = list.slice().sort((a, b) => {
    const pa = primary(a), pb = primary(b);
    const ia = pa === undefined ? 999 : hubIndex[pa];
    const ib = pb === undefined ? 999 : hubIndex[pb];
    return ia - ib || a.name.localeCompare(b.name);
  });
  const unlinked = ordered.filter((s) => !(hubsOf[s.slug] || []).length);

  const n = ordered.length;
  const nodes = {};
  ordered.forEach((s, i) => {
    const th = -Math.PI / 2 + ((i + 0.5) * 2 * Math.PI) / n;
    nodes[s.slug] = { s, th, x: CX + RX * Math.cos(th), y: CY + RY * Math.sin(th) };
  });

  hubList.forEach((h) => {
    let sx = 0, sy = 0;
    h.members.forEach((m) => { sx += Math.cos(nodes[m].th); sy += Math.sin(nodes[m].th); });
    h.th = Math.atan2(sy, sx);
  });

  // push hubs apart angularly so labels do not collide
  const minGap = (2 * Math.PI / Math.max(hubList.length, 1)) * 0.78;
  for (let pass = 0; pass < 60 && hubList.length > 1; pass++) {
    hubList.sort((a, b) => a.th - b.th);
    for (let i = 0; i < hubList.length; i++) {
      const a = hubList[i];
      const b = hubList[(i + 1) % hubList.length];
      let gap = b.th - a.th;
      if (i === hubList.length - 1) gap += 2 * Math.PI;
      if (gap < minGap) { const push = (minGap - gap) / 2; a.th -= push; b.th += push; }
    }
  }
  hubList.forEach((h, i) => {
    const k = i % 2 ? 0.7 : 1;
    h.x = CX + 255 * k * Math.cos(h.th);
    h.y = CY + 165 * k * Math.sin(h.th);
  });

  const edges = [];
  hubList.forEach((h) => h.members.forEach((m) => {
    const sp = nodes[m];
    const mx = (sp.x + h.x) / 2, my = (sp.y + h.y) / 2;
    const cx = mx + (CX - mx) * 0.22, cy = my + (CY - my) * 0.22;
    edges.push({ key: `${h.id}|${m}`, hub: h.id, species: m, d: `M${sp.x.toFixed(1)} ${sp.y.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${h.x.toFixed(1)} ${h.y.toFixed(1)}` });
  }));
  return { hubs: hubList, nodes, edges, ordered, unlinked };
}

const initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

/** Circular photo for a node. If there is no image, or it fails to load, a tidy initials disc is shown instead. */
function NodeImage({ s, r }) {
  const src = useSpeciesImageSrc(s);
  const [failed, setFailed] = useState(false);
  const id = `clip-${s.slug}`;
  const showImg = src && !failed;
  return (
    <>
      <clipPath id={id}><circle r={r} /></clipPath>
      <circle r={r} fill="#1B3025" />
      {!showImg && (
        <text textAnchor="middle" dominantBaseline="central" fill="#71866C" style={{ font: '300 italic 18px var(--font-serif)' }} aria-hidden="true">{initials(s.name)}</text>
      )}
      {showImg && (
        <image
          href={src} x={-r} y={-r} width={r * 2} height={r * 2} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${id})`}
          onError={() => setFailed(true)}
        />
      )}
    </>
  );
}

/**
 * `species`: every card (used for the text version covering the whole catalogue).
 * `curated`: the curated selection drawn by default (from data/catalogue.json).
 * `scopes`: show the scope switch (curated selection or one animal group at a time).
 */
export default function WildlifeNetwork({ species, curated, initialMode = 'taxonomy', controls = true, scopes = false, compact = false }) {
  const [mode, setMode] = useState(initialMode);
  const [scope, setScope] = useState('curated');
  const [active, setActive] = useState(null); // { kind: 'species'|'hub', id }
  const cfg = MODES[mode];

  const groups = useMemo(() => [...new Set(species.map((s) => s.group))], [species]);
  const visible = useMemo(() => {
    if (scope === 'curated') return curated;
    return species.filter((s) => s.group === scope);
  }, [scope, species, curated]);
  const layout = useMemo(() => buildLayout(mode, visible), [mode, visible]);
  const fullHubs = useMemo(() => computeHubs(mode, species, Infinity), [mode, species]);
  const speciesBySlug = useMemo(() => Object.fromEntries(species.map((s) => [s.slug, s])), [species]);

  const connectedEdges = (e) => !active || (active.kind === 'species' ? e.species === active.id : e.hub === active.id);
  const nodeLit = (slug) => {
    if (!active) return true;
    if (active.kind === 'species') return slug === active.id || layout.edges.some((e) => e.species === slug && layout.edges.some((x) => x.species === active.id && x.hub === e.hub));
    return layout.edges.some((e) => e.hub === active.id && e.species === slug);
  };
  const hubLit = (id) => !active
    || (active.kind === 'hub' ? active.id === id : layout.edges.some((e) => e.species === active.id && e.hub === id));

  const on = (a) => ({ onMouseEnter: () => setActive(a), onFocus: () => setActive(a), onMouseLeave: () => setActive(null), onBlur: () => setActive(null) });
  const scopeLabel = scope === 'curated' ? 'curated selection' : scope;

  return (
    <div>
      {controls && (
        <div className="mb-5 flex flex-wrap items-center gap-2" role="group" aria-label="Relationship type">
          {Object.entries(MODES).map(([k, m]) => (
            <button key={k} type="button" className="chip" aria-pressed={mode === k} onClick={() => { setMode(k); setActive(null); }}>
              {m.label}
            </button>
          ))}
        </div>
      )}
      {scopes && (
        <div className="mb-5 flex flex-wrap items-center gap-2" role="group" aria-label="Species shown in the network">
          <button type="button" className="chip" aria-pressed={scope === 'curated'} onClick={() => { setScope('curated'); setActive(null); }}>Curated selection ({curated.length})</button>
          {groups.map((g) => (
            <button key={g} type="button" className="chip" aria-pressed={scope === g} onClick={() => { setScope(g); setActive(null); }}>{g}</button>
          ))}
        </div>
      )}
      <p className="mb-4 max-w-[640px] text-[.88rem] text-muted" aria-live="polite">{cfg.blurb}</p>

      {/* Desktop network */}
      <div className="relative hidden overflow-hidden rounded-[20px] border border-white/10 bg-[radial-gradient(circle_at_50%_50%,rgba(212,255,114,.06),transparent_62%)] md:block">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="group" aria-label={`Network of ${visible.length} species (${scopeLabel}) by ${cfg.label.toLowerCase()}. A text version follows.`} data-draw>
          <text x={CX} y={CY - 4} textAnchor="middle" className="fill-botanical" style={{ font: '300 italic 20px var(--font-serif)' }}>{cfg.centre}</text>
          <text x={CX} y={CY + 20} textAnchor="middle" className="fill-botanical" style={{ font: '400 10px var(--font-sans)', letterSpacing: '.2em' }}>{visible.length} SPECIES · {layout.hubs.length} LINKS</text>

          <g key={`e-${mode}-${scope}`} fill="none" strokeLinecap="round" style={{ animation: 'pageIn .7s var(--ease) both' }}>
            {layout.edges.map((e) => (
              <path
                key={e.key}
                d={e.d}
                stroke={cfg.stroke}
                strokeDasharray={cfg.dash}
                strokeWidth={active && connectedEdges(e) ? 2 : 1.1}
                opacity={connectedEdges(e) ? (active ? 0.95 : 0.5) : 0.07}
                style={{ transition: 'opacity .35s, stroke-width .35s' }}
              />
            ))}
          </g>

          <g key={`h-${mode}-${scope}`} style={{ animation: 'pageIn .7s var(--ease) both' }}>
            {layout.hubs.map((h) => {
              const w = Math.max(70, h.label.length * 7.4 + 26);
              const lit = hubLit(h.id);
              const isOn = active?.kind === 'hub' && active.id === h.id;
              return (
                <g
                  key={h.id}
                  transform={`translate(${h.x.toFixed(1)} ${h.y.toFixed(1)})`}
                  role="button"
                  tabIndex={0}
                  aria-label={`${h.label}: ${h.members.length} species`}
                  aria-pressed={isOn}
                  style={{ cursor: 'pointer', opacity: lit ? 1 : 0.25, transition: 'opacity .35s' }}
                  onClick={() => setActive(isOn ? null : { kind: 'hub', id: h.id })}
                  onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); setActive(isOn ? null : { kind: 'hub', id: h.id }); } }}
                  {...on({ kind: 'hub', id: h.id })}
                >
                  <rect x={-w / 2} y={-14} width={w} height={28} rx={14} fill={isOn ? '#D4FF72' : '#0B1511'} stroke={cfg.stroke} strokeOpacity=".7" />
                  <text textAnchor="middle" y={4.5} fill={isOn ? '#0B1511' : '#F5F5ED'} style={{ font: '400 12px var(--font-sans)' }}>{h.label}</text>
                </g>
              );
            })}
          </g>

          {layout.ordered.map((s) => {
            const nd = layout.nodes[s.slug];
            const lit = nodeLit(s.slug);
            const color = STATUS_COLOR[s.statusCode];
            return (
              <g
                key={s.slug}
                style={{ transform: `translate(${nd.x.toFixed(1)}px, ${nd.y.toFixed(1)}px)`, transition: 'transform 1s var(--ease), opacity .35s', opacity: lit ? 1 : 0.28 }}
              >
                <Link href={`/species/${s.slug}`} aria-label={`${s.name}, ${s.statusLabel}. Open profile.`} {...on({ kind: 'species', id: s.slug })}>
                  <circle r={34} fill="transparent" />
                  <circle r={31} fill="none" stroke={color} strokeWidth={active?.id === s.slug ? 3 : 1.5} />
                  <NodeImage s={s} r={27} />
                  <text y={50} textAnchor="middle" fill={lit ? '#F5F5ED' : '#B8C1B3'} style={{ font: '400 13px var(--font-sans)' }}>{s.name}</text>
                </Link>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[.74rem] text-muted">
        <span className="flex items-center gap-2"><svg width="30" height="8" aria-hidden="true"><line x1="0" y1="4" x2="30" y2="4" stroke={cfg.stroke} strokeWidth="2" strokeDasharray={cfg.dash} /></svg>{cfg.label} link</span>
        {Object.entries(STATUS_COLOR).map(([c, col]) => (
          <span key={c} className="flex items-center gap-2"><i className="block h-3 w-3 rounded-full border-2" style={{ borderColor: col }} aria-hidden="true" />{c === 'CR' ? 'Critically Endangered' : c === 'EN' ? 'Endangered' : 'Vulnerable'}</span>
        ))}
      </div>
      {!compact && (
        <p className="mt-3 max-w-[680px] text-[.74rem] text-botanical">
          Predator–prey and other ecological links are not drawn until each one is documented with a source. Links shown here are taxonomy-derived, or tag-derived from the project dataset. To keep the picture readable it shows a curated selection or one group at a time; the text version below lists every species.
        </p>
      )}
      {layout.unlinked.length > 0 && (
        <p className="mt-3 max-w-[680px] text-[.76rem] text-muted">
          No {cfg.label.toLowerCase()} link inside this view: {layout.unlinked.map((s) => s.name).join(', ')}.
        </p>
      )}

      {/* Text alternative, and the mobile experience */}
      <div className="mt-6 md:hidden">
        <TextList hubs={layout.hubs} bySlug={speciesBySlug} />
      </div>
      <details className="mt-6 hidden md:block">
        <summary className="cursor-pointer text-[.82rem] text-muted underline decoration-white/20 underline-offset-4 hover:text-ivory">Text version of this view ({visible.length} species)</summary>
        <div className="mt-4"><TextList hubs={layout.hubs} bySlug={speciesBySlug} /></div>
      </details>
      {!compact && (
        <details className="mt-4">
          <summary className="cursor-pointer text-[.82rem] text-muted underline decoration-white/20 underline-offset-4 hover:text-ivory">Full text version: all {species.length} species by {cfg.label.toLowerCase()}</summary>
          <div className="mt-4"><TextList hubs={fullHubs} bySlug={speciesBySlug} /></div>
        </details>
      )}
    </div>
  );
}

function TextList({ hubs, bySlug }) {
  if (!hubs.length) return <p className="text-[.88rem] text-muted">No shared links in this view.</p>;
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {hubs.map((h) => (
        <li key={h.id} className="rounded-2xl border border-white/10 p-4">
          <h3 className="font-serif text-[1.15rem] font-light">{h.label}</h3>
          <ul className="mt-2 space-y-1 text-[.88rem] text-muted">
            {h.members.map((m) => {
              const s = bySlug[m];
              return (
                <li key={m}>
                  <Link href={`/species/${m}`} className="underline decoration-white/20 underline-offset-4 hover:text-lime">{s.name}</Link>
                  <span className="sci ml-2 text-botanical">{s.scientificName}</span>
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ul>
  );
}
