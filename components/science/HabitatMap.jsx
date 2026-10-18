'use client';
import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';

const LAYERS = {
  dark: {
    label: 'Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
    options: { subdomains: 'abcd', maxZoom: 18 },
  },
  satellite: {
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri. Source: Esri, Maxar, Earthstar Geographics and the GIS User Community',
    options: { maxZoom: 17 },
  },
  topo: {
    label: 'Topographic',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM · Style © <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
    options: { subdomains: 'abc', maxZoom: 17 },
  },
};

const PRECISION_COPY = {
  'representative-site': 'The pin marks one representative site. The species may occur elsewhere in its range.',
  'region-centre': 'The pin is an approximate regional marker, not a precise or complete range.',
  'wide-ranging': 'This species ranges widely. The pin is only a placeholder position and does not show where the animal is or how far it travels.',
};

const fmt = (n, pos, neg) => `${Math.abs(n).toFixed(2)}° ${n >= 0 ? pos : neg}`;

/**
 * Habitat Explorer.
 * markers: [{ slug, name, lat, lng, zoom, locName, precision }]
 * Never presents a point as a species range; precision copy is always shown.
 */
export default function HabitatMap({ markers, currentSlug, onSelect, height = 380, title }) {
  const box = useRef(null);
  const mapRef = useRef(null);
  const LRef = useRef(null);
  const tileRef = useRef(null);
  const pinRefs = useRef({});
  const stats = useRef({ ok: 0, bad: 0 });
  const [layer, setLayer] = useState('dark');
  const [status, setStatus] = useState('loading'); // loading | ready | tiles-failed | failed
  const [interactive, setInteractive] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const current = markers.find((m) => m.slug === currentSlug) || markers[0];

  // create map once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const L = (await import('leaflet')).default;
        if (cancelled || !box.current) return;
        LRef.current = L;
        const coarse = window.matchMedia('(pointer: coarse)').matches;
        const map = L.map(box.current, {
          center: [current.lat, current.lng],
          zoom: 3,
          zoomControl: false,
          scrollWheelZoom: false,
          dragging: !coarse,
          tap: false,
          worldCopyJump: true,
          attributionControl: true,
        });
        L.control.zoom({ position: 'topright' }).addTo(map);
        mapRef.current = map;
        if (coarse) setInteractive(false);
        setMapReady(true);
        setStatus('ready');
      } catch {
        if (!cancelled) setStatus('failed');
      }
    })();
    return () => {
      cancelled = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      pinRefs.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // tile layer
  useEffect(() => {
    const map = mapRef.current, L = LRef.current;
    if (!mapReady || !map || !L || status === 'failed') return;
    if (tileRef.current) map.removeLayer(tileRef.current);
    stats.current = { ok: 0, bad: 0 };
    const def = LAYERS[layer];
    const t = L.tileLayer(def.url, { ...def.options, attribution: def.attribution });
    t.on('tileload', () => { stats.current.ok += 1; });
    t.on('tileerror', () => {
      stats.current.bad += 1;
      if (stats.current.bad >= 4 && stats.current.ok === 0) setStatus('tiles-failed');
    });
    t.addTo(map);
    tileRef.current = t;
    setStatus((s) => (s === 'tiles-failed' ? 'ready' : s));
  }, [layer, mapReady, status === 'failed']); // eslint-disable-line react-hooks/exhaustive-deps

  // markers + camera
  useEffect(() => {
    const map = mapRef.current, L = LRef.current;
    if (!map || !L) return;
    Object.values(pinRefs.current).forEach((m) => map.removeLayer(m));
    pinRefs.current = {};
    markers.forEach((m) => {
      const isCur = m.slug === current.slug;
      const size = isCur ? 22 : 14;
      const dot = document.createElement('span');
      dot.style.width = `${size}px`;
      dot.style.height = `${size}px`;
      dot.style.background = isCur ? '#D4FF72' : '#71866C';
      const icon = L.divIcon({ className: 'ws-pin', html: dot, iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
      const pin = L.marker([m.lat, m.lng], { icon, title: m.name, alt: `${m.name}: ${m.locName}`, keyboard: true, riseOnHover: true }).addTo(map);
      // built from text nodes, never from an HTML string, so no data can inject markup
      const tip = document.createElement('div');
      const strong = document.createElement('strong');
      strong.textContent = m.name;
      tip.append(strong, document.createElement('br'), document.createTextNode(m.locName));
      pin.bindTooltip(tip, { direction: 'top', offset: [0, -8], className: 'ws-tip' });
      if (onSelect) pin.on('click', () => onSelect(m.slug));
      pinRefs.current[m.slug] = pin;
    });
    const zoom = current.precision === 'wide-ranging' ? 3 : current.precision === 'region-centre' ? Math.min(current.zoom || 5, 5) : current.zoom || 5;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) map.setView([current.lat, current.lng], zoom);
    else map.flyTo([current.lat, current.lng], zoom, { duration: 1.1 });
  }, [markers, current.slug, status]); // eslint-disable-line react-hooks/exhaustive-deps

  const enable = () => {
    const map = mapRef.current;
    if (map) { map.dragging.enable(); map.scrollWheelZoom.enable(); }
    setInteractive(true);
  };

  return (
    <figure>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <figcaption className="text-[.8rem] text-muted">{title || `Habitat explorer: ${current.name}`}</figcaption>
        <div className="flex gap-1.5" role="group" aria-label="Map style">
          {Object.entries(LAYERS).map(([k, l]) => (
            <button key={k} type="button" className="chip" aria-pressed={layer === k} onClick={() => setLayer(k)}>{l.label}</button>
          ))}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-white/10" style={{ height }}>
        {status === 'failed' ? (
          <FallbackMap markers={markers} current={current} />
        ) : (
          <div ref={box} className="h-full w-full" role="region" aria-label={`Map showing ${current.name} location marker`} />
        )}
        {status === 'tiles-failed' && (
          <div className="absolute inset-x-3 top-3 z-[500] rounded-xl border border-status-en/50 bg-forest/95 px-4 py-2.5 text-[.8rem] text-ivory" role="status">
            Map tiles could not be loaded (offline or blocked). Pins and coordinates still work; try another map style or check your connection.
          </div>
        )}
        {!interactive && status === 'ready' && (
          <button type="button" onClick={enable} className="absolute bottom-3 left-3 z-[500] rounded-full border border-white/20 bg-forest/90 px-4 py-2 text-[.78rem] text-ivory">
            Tap to explore the map
          </button>
        )}
      </div>

      <div className="mt-3 space-y-1 text-[.8rem] text-muted">
        <p>
          <strong className="font-medium text-ivory">{current.locName}</strong> · <span className="font-mono text-[.76rem]">{fmt(current.lat, 'N', 'S')}, {fmt(current.lng, 'E', 'W')}</span>
        </p>
        <p className="note-box">{PRECISION_COPY[current.precision] || PRECISION_COPY['region-centre']}</p>
      </div>
    </figure>
  );
}

/** Offline-safe fallback: a plain graticule with pins. Deliberately no hand-drawn continents. */
function FallbackMap({ markers, current }) {
  const x = (lng) => ((lng + 180) / 360) * 800;
  const y = (lat) => ((90 - lat) / 180) * 400;
  return (
    <svg viewBox="0 0 800 400" className="h-full w-full bg-forest-2" role="img" aria-label={`Coordinate chart with a marker for ${current.name} at ${current.lat}, ${current.lng}. The interactive map could not load.`}>
      {[-60, -30, 0, 30, 60].map((lat) => <line key={lat} x1="0" x2="800" y1={y(lat)} y2={y(lat)} stroke="#1B3025" strokeDasharray="3 5" />)}
      {[-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map((lng) => <line key={lng} y1="0" y2="400" x1={x(lng)} x2={x(lng)} stroke="#1B3025" strokeDasharray="3 5" />)}
      {markers.map((m) => (
        <circle key={m.slug} cx={x(m.lng)} cy={y(m.lat)} r={m.slug === current.slug ? 7 : 4} fill={m.slug === current.slug ? '#D4FF72' : '#71866C'} stroke="#F5F5ED" strokeWidth="1.5" />
      ))}
      <text x="400" y="392" textAnchor="middle" fill="#71866C" fontSize="11">Interactive map unavailable. Showing coordinates only.</text>
    </svg>
  );
}
