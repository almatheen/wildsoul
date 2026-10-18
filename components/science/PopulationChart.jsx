'use client';
import { useMemo, useState } from 'react';
import { safeExternalUrl } from '../../lib/safeUrl.mjs';

const W = 640, H = 300, PL = 62, PR = 24, PT = 20, PB = 40;

function niceLinearTicks(max) {
  const raw = max / 4;
  const mag = 10 ** Math.floor(Math.log10(raw || 1));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) || mag;
  const out = [];
  for (let v = 0; v <= max + step * 0.01; v += step) out.push(Math.round(v * 100) / 100);
  return { ticks: out, top: out[out.length - 1] };
}

const nf = new Intl.NumberFormat('en');

/**
 * Population history.
 * A chart is drawn ONLY when the species has a series with a unit, a source and a method (see validateCatalogue).
 * Today no species does, so every profile shows the unavailable state. The unsourced figures that came with
 * the original project data are kept in a collapsed table, clearly labelled, and are never plotted.
 * X positions follow the real year; dashed lines join reported values and say nothing about the years between.
 */
export default function PopulationChart({ species }) {
  const { population } = species;
  const [style, setStyle] = useState('line');
  const [scale, setScale] = useState('linear');
  const [sel, setSel] = useState(population.series.length - 1);

  const series = population.series;
  const unavailable = series.length < 2;

  const geo = useMemo(() => {
    if (unavailable) return null;
    const y0 = series[0].year, y1 = series[series.length - 1].year;
    const vmax = Math.max(...series.map((d) => d.value));
    const vmin = Math.min(...series.map((d) => d.value));
    const x = (yr) => PL + ((yr - y0) / (y1 - y0 || 1)) * (W - PL - PR);

    let y, ticks;
    if (scale === 'log') {
      const lo = 10 ** Math.floor(Math.log10(Math.max(vmin, 1)));
      const hi = 10 ** Math.ceil(Math.log10(vmax));
      const span = Math.log10(hi) - Math.log10(lo) || 1;
      y = (v) => PT + (1 - (Math.log10(Math.max(v, 1)) - Math.log10(lo)) / span) * (H - PT - PB);
      ticks = [];
      for (let p = Math.log10(lo); p <= Math.log10(hi) + 1e-9; p += 1) ticks.push(10 ** p);
    } else {
      const { ticks: t, top } = niceLinearTicks(vmax);
      y = (v) => PT + (1 - v / top) * (H - PT - PB);
      ticks = t;
    }
    const pts = series.map((d) => ({ ...d, px: x(d.year), py: y(d.value) }));
    return { x, y, ticks, pts, y0, y1 };
  }, [series, scale, unavailable]);

  if (unavailable) {
    const iucn = safeExternalUrl(species.sources?.find((x) => x.kind === 'iucn-search')?.url);
    const legacy = population.legacyFigures || [];
    return (
      <div>
        <div className="rounded-2xl border border-dashed border-status-en/50 p-6">
          <span className="unverified-pill">Chart not available</span>
          <p className="mt-3 text-[.92rem] text-muted">{population.reason}</p>
          <p className="mt-3 text-[.88rem] text-muted">A population chart is shown here only when a dated, sourced series with a stated unit and method has been added. A single estimate would never be drawn as a trend.</p>
          {iucn && <a className="link-u mt-4 inline-block text-muted" href={iucn} target="_blank" rel="noopener noreferrer">Check the IUCN Red List entry</a>}
        </div>
        {legacy.length > 0 && (
          <details className="mt-5">
            <summary className="cursor-pointer text-[.82rem] text-muted underline decoration-white/20 underline-offset-4 hover:text-ivory">Unsourced figures from the original project data (do not cite)</summary>
            <p className="note-box mt-3">These numbers came with the original project data. They have no source, survey method, unit or exact date, so they are not plotted and may mix different units. They are shown only so nothing is silently removed.</p>
            <table className="mt-3 w-full text-left text-[.85rem]">
              <caption className="sr-only">Unsourced legacy figures for {species.name}</caption>
              <thead><tr className="text-muted"><th className="py-1.5 pr-4 font-normal">Year</th><th className="py-1.5 font-normal">Figure (unverified)</th></tr></thead>
              <tbody>{legacy.map((d) => <tr key={d.year} className="border-t border-white/10"><td className="py-1.5 pr-4">{d.year}</td><td className="py-1.5">{nf.format(d.value)}</td></tr>)}</tbody>
            </table>
          </details>
        )}
      </div>
    );
  }
  if (!geo) return <p className="text-muted">Not enough reported values to draw a chart.</p>;

  const s = series[sel];
  const baseY = H - PB;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <span className="rounded-full border border-lime/40 px-3 py-1 text-[.66rem] uppercase tracking-[.14em] text-lime">Sourced series</span>
        <div className="flex flex-wrap gap-1.5">
          <div className="flex gap-1.5" role="group" aria-label="Chart style">
            <button type="button" className="chip" aria-pressed={style === 'line'} onClick={() => setStyle('line')}>Line</button>
            <button type="button" className="chip" aria-pressed={style === 'bars'} onClick={() => setStyle('bars')}>Bars</button>
          </div>
          <div className="flex gap-1.5" role="group" aria-label="Scale">
            <button type="button" className="chip" aria-pressed={scale === 'linear'} onClick={() => setScale('linear')}>Linear</button>
            <button type="button" className="chip" aria-pressed={scale === 'log'} onClick={() => setScale('log')}>Log</button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-forest-2/60 p-3 sm:p-5">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="group" aria-label={`Reported population values for ${species.name}, ${series[0].year} to ${series[series.length - 1].year}. A data table follows the chart.`}>
          {geo.ticks.map((t) => (
            <g key={t}>
              <line x1={PL} x2={W - PR} y1={geo.y(t)} y2={geo.y(t)} stroke="rgba(255,255,255,.09)" />
              <text x={PL - 10} y={geo.y(t) + 4} textAnchor="end" fill="#B8C1B3" style={{ font: '400 11px var(--font-sans)' }}>{t >= 1000 ? nf.format(t) : t}</text>
            </g>
          ))}
          <line x1={PL} x2={W - PR} y1={baseY} y2={baseY} stroke="rgba(255,255,255,.25)" />

          {style === 'line' && (
            <polyline
              points={geo.pts.map((p) => `${p.px.toFixed(1)},${p.py.toFixed(1)}`).join(' ')}
              fill="none" stroke="#D4FF72" strokeOpacity=".55" strokeWidth="1.6" strokeDasharray="5 5" strokeLinejoin="round"
            />
          )}
          {style === 'bars' && geo.pts.map((p, i) => (
            <rect key={p.year} x={p.px - 11} y={p.py} width="22" height={Math.max(baseY - p.py, 1)} rx="3" fill={i === sel ? '#D4FF72' : '#71866C'} fillOpacity={i === sel ? 1 : 0.75} />
          ))}

          {geo.pts.map((p, i) => (
            <g key={p.year}>
              <text x={p.px} y={H - 16} textAnchor="middle" fill={i === sel ? '#F5F5ED' : '#B8C1B3'} style={{ font: '400 11px var(--font-sans)' }}>{p.year}</text>
              {style === 'line' && <circle cx={p.px} cy={p.py} r={i === sel ? 6 : 4.5} fill={i === sel ? '#D4FF72' : '#0B1511'} stroke="#D4FF72" strokeWidth="2" />}
              <circle
                cx={p.px} cy={p.py} r="16" fill="transparent" tabIndex={0} role="button" style={{ cursor: 'pointer' }}
                aria-label={`${p.year}: ${nf.format(p.value)} reported`}
                onClick={() => setSel(i)} onFocus={() => setSel(i)} onMouseEnter={() => setSel(i)}
              />
            </g>
          ))}
        </svg>

        <p className="mt-2 text-[.82rem] text-muted" aria-live="polite">
          <strong className="font-medium text-ivory">{s.year}</strong>: {nf.format(s.value)} reported
          <span className="text-botanical"> ({population.unit}; source: {population.source}; method: {population.method})</span>
        </p>
      </div>

      <p className="note-box mt-4">
        Dashed lines only connect reported values and say nothing about the years in between.
      </p>

      <details className="mt-4">
        <summary className="cursor-pointer text-[.82rem] text-muted underline decoration-white/20 underline-offset-4 hover:text-ivory">Data table</summary>
        <table className="mt-3 w-full text-left text-[.85rem]">
          <caption className="sr-only">Reported values for {species.name}</caption>
          <thead><tr className="text-muted"><th className="py-1.5 pr-4 font-normal">Year</th><th className="py-1.5 font-normal">Reported value</th></tr></thead>
          <tbody>{series.map((d) => <tr key={d.year} className="border-t border-white/10"><td className="py-1.5 pr-4">{d.year}</td><td className="py-1.5">{nf.format(d.value)}</td></tr>)}</tbody>
        </table>
      </details>
    </div>
  );
}
