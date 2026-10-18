/**
 * Pure catalogue builder (no JSON imports, no framework code) so it can be unit-tested with Node.
 * lib/species.js feeds it the JSON layers and re-exports the API the app uses.
 *
 * Layers:
 *   legacy      data/species-dataset.json     original project dataset (unmodified)
 *   enrichment  data/species-enrichment.json  taxonomy, tags and audit notes for the legacy species
 *   additions   data/species-additions.json   records for the species added to complete 48
 *   images      data/species-images.json      verified image records from `npm run images:fetch`
 *   config      data/catalogue.json           archived species, featured list, network list, group order
 */

export const STATUS = {
  CR: { code: 'CR', label: 'Critically Endangered', short: 'Critical', rank: 3 },
  EN: { code: 'EN', label: 'Endangered', short: 'Endangered', rank: 2 },
  VU: { code: 'VU', label: 'Vulnerable', short: 'Vulnerable', rank: 1 },
};

export const GEO_PRECISIONS = ['representative-site', 'region-centre', 'wide-ranging'];
export const RANKS = ['genus', 'family', 'order'];

const NOT_CHECKED =
  'The category and facts were not re-checked against the live IUCN Red List when this version was built (the build environment could not reach it). Verify the category and assessment date before citing.';

const cleanName = (n) => n.replace(/\s*\(.*\)\s*$/, '');

/** Source records are links to search or reading pages. None of them is a citation of a specific assessment. */
export function buildSources(scientificName, wikiTitle) {
  return [
    {
      kind: 'iucn-search',
      label: `IUCN Red List: search for ${scientificName}`,
      url: `https://www.iucnredlist.org/search?query=${encodeURIComponent(scientificName)}&searchType=species`,
      supports: 'Conservation category and assessment date',
      checked: false,
    },
    {
      kind: 'wikipedia',
      label: `Wikipedia: ${wikiTitle}`,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(wikiTitle.replace(/ /g, '_'))}`,
      supports: 'General introduction, taxonomy and further references',
      checked: false,
    },
  ];
}

function fromLegacy(base, extra, images) {
  const chart = extra.chart || { mode: 'legacy-unverified' };
  return {
    id: base.id,
    name: cleanName(base.name),
    nickname: (base.name.match(/\((.*)\)/) || [])[1] || null,
    scientificName: base.scientificName,
    group: extra.group,
    taxonomy: extra.taxonomy,
    iucn: extra.iucn,
    wiki: extra.wiki,
    tagline: extra.tagline,
    summary: base.story,
    summaryOrigin: 'legacy',
    ecologicalRole: extra.ecologicalRole,
    habitat: base.habitat,
    habitatTags: extra.habitatTags,
    region: base.region,
    coordinates: base.coordinates,
    geo: { ...base.geo, precision: extra.geoPrecision },
    threats: base.threats,
    threatTags: extra.threatTags,
    conservationActions: [base.conservationWin],
    conservationReported: true,
    audio: { description: base.audioDescription, hint: base.acousticHint, params: base.synthAudio },
    legacyStatusText: base.status,
    legacyOrder: base.level,
    population: {
      estimate: null,
      series: [],
      available: false,
      verified: false,
      reason: chart.reason || 'The original project data gives no source, survey year, unit or method for its population figures, so no chart is drawn.',
      legacyFigures: base.timelineStats.map(({ year, pop }) => ({ year, value: pop })),
    },
    audit: extra.audit || [],
    originImage: images[base.id] || null,
  };
}

function fromAddition(id, a, order, images) {
  const g = a.geo;
  return {
    id,
    name: a.name,
    nickname: null,
    scientificName: a.scientificName,
    group: a.group,
    taxonomy: a.taxonomy,
    iucn: a.iucn,
    wiki: a.wiki,
    tagline: a.tagline,
    summary: a.summary,
    summaryOrigin: 'authored',
    ecologicalRole: a.ecologicalRole,
    habitat: a.habitat,
    habitatTags: a.habitatTags,
    region: a.region,
    coordinates: `${Math.abs(g.lat).toFixed(2)}° ${g.lat >= 0 ? 'N' : 'S'}, ${Math.abs(g.lng).toFixed(2)}° ${g.lng >= 0 ? 'E' : 'W'}`,
    geo: { lat: g.lat, lng: g.lng, zoom: g.zoom, country: g.country, locName: g.locName, precision: a.geoPrecision },
    threats: a.threats,
    threatTags: a.threatTags,
    conservationActions: a.conservationActions,
    conservationReported: false,
    audio: a.audio,
    legacyStatusText: null,
    legacyOrder: 1000 + order,
    population: {
      estimate: null,
      series: [],
      available: false,
      verified: false,
      reason: 'No reliable, sourced population estimate has been added for this species. Estimates differ between assessments and are not reproduced here without a source, unit and date.',
      legacyFigures: [],
    },
    audit: [NOT_CHECKED, ...(a.audit || [])],
    originImage: images[id] || null,
  };
}

function finish(raw, imagesRecord, index) {
  const code = raw.iucn.code;
  return {
    slug: raw.id,
    id: raw.id,
    level: index + 1,
    name: raw.name,
    nickname: raw.nickname,
    scientificName: raw.scientificName,
    status: STATUS[code],
    statusScope: raw.iucn.scope,
    statusNote: raw.iucn.note || null,
    statusVerified: false,
    legacyStatusText: raw.legacyStatusText,
    group: raw.group,
    taxonomy: raw.taxonomy,
    tagline: raw.tagline,
    summary: raw.summary,
    summaryOrigin: raw.summaryOrigin,
    ecologicalRole: raw.ecologicalRole,
    habitat: raw.habitat,
    habitatTags: raw.habitatTags,
    region: raw.region,
    coordinates: raw.coordinates,
    geo: raw.geo,
    population: raw.population,
    threats: raw.threats,
    threatTags: raw.threatTags,
    conservation: { actions: raw.conservationActions, reported: raw.conservationReported },
    audio: { kind: 'synthesized', ...raw.audio },
    wiki: raw.wiki,
    image: raw.originImage,
    audit: raw.audit,
    sources: buildSources(raw.scientificName, raw.wiki),
    related: [], // filled below
  };
}

export function closestRank(a, b) {
  return RANKS.find((r) => a.taxonomy[r] && a.taxonomy[r] === b.taxonomy[r]) || null;
}

/** Deterministic related-species list: closest taxonomy first, then shared habitat and threat tags. */
export function deriveRelated(me, all, limit = 3) {
  const scored = all
    .filter((o) => o.slug !== me.slug)
    .map((o) => {
      const rank = closestRank(me, o);
      const rankScore = rank === 'genus' ? 100 : rank === 'family' ? 60 : rank === 'order' ? 30 : 0;
      const hab = me.habitatTags.filter((t) => o.habitatTags.includes(t)).length;
      const thr = me.threatTags.filter((t) => o.threatTags.includes(t)).length;
      const sameGroup = me.group === o.group ? 10 : 0;
      return { o, score: rankScore + hab * 6 + thr * 3 + sameGroup + o.status.rank * 0.1 };
    })
    .filter((x) => x.score >= 6)
    .sort((a, b) => b.score - a.score || a.o.slug.localeCompare(b.o.slug));
  return scored.slice(0, limit).map((x) => x.o.slug);
}

export function buildCatalogue({ legacy, enrichment, additions, images = {}, config }) {
  const archivedSlugs = new Set((config.archived || []).map((a) => a.slug));
  const rawAll = [];

  for (const base of legacy.species) {
    const extra = enrichment.species[base.id];
    if (!extra) throw new Error(`Missing enrichment for species "${base.id}"`);
    rawAll.push(fromLegacy(base, extra, images));
  }
  Object.entries(additions.species).forEach(([id, a], i) => rawAll.push(fromAddition(id, a, i, images)));

  const groupOrder = config.groupOrder;
  const kept = rawAll
    .filter((r) => !archivedSlugs.has(r.id))
    .sort((a, b) => groupOrder.indexOf(a.group) - groupOrder.indexOf(b.group) || a.legacyOrder - b.legacyOrder);

  const species = kept.map((r, i) => finish(r, images, i));
  species.forEach((s) => { s.related = deriveRelated(s, species); });

  const archived = rawAll
    .filter((r) => archivedSlugs.has(r.id))
    .map((r) => ({ slug: r.id, name: r.name, group: r.group, reason: config.archived.find((a) => a.slug === r.id).reason }));

  return { species, archived };
}

// ---------------------------------------------------------------- groups and relations

export const GROUP_DEFS = [
  { name: 'Mammals', slug: 'mammals', class: 'Mammalia', blurb: 'Warm-blooded vertebrates that nurse their young with milk. Most have hair or fur.', traits: ['Hair or fur', 'Milk for young', 'Live birth in most species'] },
  { name: 'Birds', slug: 'birds', class: 'Aves', blurb: 'Feathered, egg-laying vertebrates. Most fly, though some, like the kākāpō, do not.', traits: ['Feathers', 'Beaks without teeth', 'Hard-shelled eggs'] },
  { name: 'Reptiles', slug: 'reptiles', class: 'Reptilia', blurb: 'Scaled or shelled vertebrates that depend on external heat and mostly lay eggs.', traits: ['Scales or shell', 'Ectothermic', 'Mostly egg-laying'] },
  { name: 'Amphibians', slug: 'amphibians', class: 'Amphibia', blurb: 'Vertebrates that typically live part of their lives in water, with thin, permeable skin.', traits: ['Moist, thin skin', 'Aquatic larvae in most species', 'Sensitive to water quality'] },
  { name: 'Fish', slug: 'fish', class: 'Chondrichthyes and Actinopterygii', blurb: 'Gill-breathing aquatic vertebrates, from sharks and rays to eels and sturgeons.', traits: ['Gills', 'Fins', 'Most are cold-blooded'] },
  { name: 'Invertebrates', slug: 'invertebrates', class: null, blurb: 'Animals without backbones, from corals and clams to butterflies and crustaceans.', traits: ['No backbone', 'The vast majority of animal species', 'Very varied body plans'] },
];

const RANK_LABEL = { genus: 'Same genus', family: 'Same family', order: 'Same order' };

function explainRank(rank, a, b) {
  const value = a.taxonomy[rank];
  const base = `Both belong to the ${rank} ${value}.`;
  const notes = [a.taxonomy.note, b.taxonomy.note].filter(Boolean);
  if (rank === 'order' && notes.length) return `${base} ${notes[0]}`;
  if (rank === 'genus') return `${base} Close relatives within one genus.`;
  if (rank === 'family') return `${base} They share a family but are different genera.`;
  return base;
}

/** Relationships for one species, all derived from data: taxonomic, habitat, threat. */
export function relationsFor(all, slug, labels) {
  const me = all.find((s) => s.slug === slug);
  if (!me) return { taxonomic: [], habitat: [], threat: [], curated: [], broaderGroup: null };
  const others = all.filter((s) => s.slug !== slug);

  const taxonomic = others
    .map((o) => ({ o, rank: closestRank(me, o) }))
    .filter((x) => x.rank)
    .sort((x, y) => RANKS.indexOf(x.rank) - RANKS.indexOf(y.rank) || y.o.status.rank - x.o.status.rank)
    .map(({ o, rank }) => ({ species: o, type: rank, label: RANK_LABEL[rank], reason: explainRank(rank, me, o) }));

  const shared = (field) =>
    others
      .map((o) => ({ o, tags: me[field].filter((t) => o[field].includes(t)) }))
      .filter((x) => x.tags.length)
      .sort((x, y) => y.tags.length - x.tags.length || y.o.status.rank - x.o.status.rank);

  const habitat = shared('habitatTags').map(({ o, tags }) => ({
    species: o, type: 'habitat', label: 'Shares habitat', tags,
    reason: `Both occur in: ${tags.map((t) => labels.habitat[t]).join(', ')}. Sharing a habitat type does not mean sharing a location.`,
  }));
  const threat = shared('threatTags').map(({ o, tags }) => ({
    species: o, type: 'threat', label: 'Shares threat', tags,
    reason: `Both are affected by: ${tags.map((t) => labels.threat[t]).join(', ')}, according to the project dataset.`,
  }));

  const curated = me.related.map((rs) => all.find((s) => s.slug === rs)).filter(Boolean);
  const group = GROUP_DEFS.find((g) => g.name === me.group);
  return { taxonomic, habitat, threat, curated, broaderGroup: group || null };
}

export function groupsFor(all) {
  return GROUP_DEFS.map((g) => ({ ...g, members: all.filter((s) => s.group === g.name) }));
}

export function groupByTagFor(all, field) {
  const out = {};
  all.forEach((s) => s[field].forEach((t) => { (out[t] ||= []).push(s); }));
  return out;
}

/** Look up a list of slugs; throws on unknown slugs so config mistakes fail loudly. */
export function pick(all, slugs, what) {
  return slugs.map((slug) => {
    const s = all.find((x) => x.slug === slug);
    if (!s) throw new Error(`${what}: unknown species slug "${slug}"`);
    return s;
  });
}
