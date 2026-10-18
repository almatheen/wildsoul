/**
 * Validation of the shared dataset. Used by `npm run check:data` and by the unit tests.
 * Returns { errors, warnings, stats }. It checks structure and internal consistency only:
 * it cannot confirm that any biological fact is true.
 */
import { STATUS, GEO_PRECISIONS, GROUP_DEFS } from './catalogue.mjs';
import { safeExternalUrl, safeImageUrl } from './safeUrl.mjs';

const CLASS_BY_GROUP = {
  Mammals: ['Mammalia'], Birds: ['Aves'], Reptiles: ['Reptilia'], Amphibians: ['Amphibia'],
  Fish: ['Chondrichthyes', 'Actinopterygii'],
  Invertebrates: ['Insecta', 'Anthozoa', 'Bivalvia', 'Malacostraca', 'Merostomata', 'Cephalopoda', 'Gastropoda', 'Arachnida'],
};
const AUDIO_TYPES = ['roar', 'click', 'snort', 'boom', 'chestbeat', 'splash', 'screech', 'whale', 'bleat', 'bubble', 'hiss'];
const SOURCE_KINDS = ['iucn-search', 'iucn-assessment', 'wikipedia', 'organisation', 'paper', 'government'];
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const REQUIRED_STR = ['slug', 'name', 'scientificName', 'group', 'tagline', 'summary', 'ecologicalRole', 'habitat', 'region', 'wiki'];

export function validateCatalogue({ species, archived = [], config, enrichment, images = {}, target }) {
  const errors = [];
  const warnings = [];
  const err = (m) => errors.push(m);
  const slugs = new Set(species.map((s) => s.slug));

  // counts
  const counts = Object.fromEntries(GROUP_DEFS.map((g) => [g.name, 0]));
  species.forEach((s) => { if (s.group in counts) counts[s.group] += 1; });
  for (const [g, n] of Object.entries(target)) if (counts[g] !== n) err(`Group ${g}: expected ${n} species, found ${counts[g]}`);
  const expectedTotal = Object.values(target).reduce((a, b) => a + b, 0);
  if (species.length !== expectedTotal) err(`Expected ${expectedTotal} species, found ${species.length}`);

  // uniqueness
  const dupes = (arr) => arr.filter((v, i) => arr.indexOf(v) !== i);
  dupes(species.map((s) => s.slug)).forEach((d) => err(`Duplicate slug "${d}"`));
  dupes(species.map((s) => s.name.toLowerCase())).forEach((d) => err(`Duplicate common name "${d}"`));
  dupes(species.map((s) => s.scientificName.toLowerCase())).forEach((d) => err(`Duplicate scientific name "${d}"`));

  for (const s of species) {
    const id = s.slug;
    if (!SLUG_RE.test(id)) err(`${id}: slug is not lowercase-kebab-case`);
    REQUIRED_STR.forEach((f) => { if (typeof s[f] !== 'string' || !s[f].trim()) err(`${id}: missing "${f}"`); });
    if (!GROUP_DEFS.some((g) => g.name === s.group)) err(`${id}: unknown group "${s.group}"`);

    // taxonomy
    for (const r of ['class', 'order', 'family', 'genus']) if (!s.taxonomy?.[r]) err(`${id}: taxonomy.${r} missing`);
    if (s.taxonomy?.genus && !s.scientificName.startsWith(`${s.taxonomy.genus} `)) err(`${id}: genus "${s.taxonomy.genus}" is not the first word of "${s.scientificName}"`);
    if (CLASS_BY_GROUP[s.group] && !CLASS_BY_GROUP[s.group].includes(s.taxonomy?.class)) err(`${id}: class "${s.taxonomy?.class}" does not fit group ${s.group}`);

    // status
    if (!STATUS[s.status?.code]) err(`${id}: status code "${s.status?.code}" is not CR/EN/VU`);
    else if (s.status.label !== STATUS[s.status.code].label) err(`${id}: status label does not match its code`);
    if (s.legacyStatusText && !s.legacyStatusText.toLowerCase().startsWith(s.status.label.toLowerCase())) err(`${id}: legacy status "${s.legacyStatusText}" disagrees with ${s.status.code}`);
    if (!['species', 'subspecies', 'population'].includes(s.statusScope)) err(`${id}: statusScope invalid`);
    if (s.statusScope === 'subspecies' && s.scientificName.split(' ').length < 3) err(`${id}: status scope is subspecies but the scientific name has no subspecies part`);

    // tags
    if (!s.habitatTags?.length) err(`${id}: needs at least one habitat tag`);
    if (!s.threatTags?.length) err(`${id}: needs at least one threat tag`);
    (s.habitatTags || []).forEach((t) => { if (!enrichment.habitatTags[t]) err(`${id}: unknown habitat tag "${t}"`); });
    (s.threatTags || []).forEach((t) => { if (!enrichment.threatTags[t]) err(`${id}: unknown threat tag "${t}"`); });

    // threats and conservation
    if (!s.threats?.length || s.threats.some((t) => typeof t !== 'string' || !t.trim())) err(`${id}: needs at least one threat text`);
    if (!s.conservation?.actions?.length || s.conservation.actions.some((t) => typeof t !== 'string' || !t.trim())) err(`${id}: needs at least one conservation action`);

    // geography
    const g = s.geo || {};
    if (!Number.isFinite(g.lat) || g.lat < -90 || g.lat > 90) err(`${id}: invalid latitude`);
    if (!Number.isFinite(g.lng) || g.lng < -180 || g.lng > 180) err(`${id}: invalid longitude`);
    if (!GEO_PRECISIONS.includes(g.precision)) err(`${id}: geo precision invalid`);
    if (!g.locName) err(`${id}: geo.locName missing`);

    // audio
    if (!AUDIO_TYPES.includes(s.audio?.params?.type)) err(`${id}: unknown audio type "${s.audio?.params?.type}"`);
    if (!(s.audio?.params?.baseFreq > 0) || !(s.audio?.params?.duration > 0 && s.audio.params.duration <= 4)) err(`${id}: invalid audio parameters`);
    if (s.audio?.kind !== 'synthesized') err(`${id}: audio must be marked synthesized`);

    // population: figures are only allowed when they carry their provenance
    const p = s.population;
    if (!p) err(`${id}: population block missing`);
    else {
      if (p.series?.length) {
        if (!p.unit || !p.source || !p.method) err(`${id}: population series needs unit, source and method`);
        if (p.series.length < 2 || p.series.some((d, i) => i && d.year <= p.series[i - 1].year)) err(`${id}: population series years must be strictly increasing`);
      }
      if (p.estimate) {
        const e = p.estimate;
        if (!(e.value >= 0) || !e.unit || !e.year || !e.source) err(`${id}: population estimate needs value, unit, year and source`);
      }
      if (!p.series?.length && !p.estimate && p.available) err(`${id}: population is marked available but has no data`);
    }

    // sources
    if (!Array.isArray(s.sources) || s.sources.length < 1) err(`${id}: needs at least one source`);
    (s.sources || []).forEach((src, i) => {
      if (!SOURCE_KINDS.includes(src.kind)) err(`${id}: source ${i} has unknown kind "${src.kind}"`);
      if (!src.label) err(`${id}: source ${i} has no label`);
      if (!safeExternalUrl(src.url)) err(`${id}: source ${i} has an invalid URL`);
      if (typeof src.checked !== 'boolean') err(`${id}: source ${i} must state whether the link was checked`);
    });

    // relationships
    if (!Array.isArray(s.related) || s.related.length < 1) err(`${id}: has no related species`);
    (s.related || []).forEach((r) => {
      if (!slugs.has(r)) err(`${id}: related slug "${r}" does not exist`);
      if (r === id) err(`${id}: lists itself as related`);
    });
    if (new Set(s.related).size !== (s.related || []).length) err(`${id}: duplicate related slugs`);

    if (!s.audit?.length) warnings.push(`${id}: no audit notes`);
  }

  // images manifest
  for (const [key, rec] of Object.entries(images)) {
    if (key.startsWith('_')) continue;
    if (!slugs.has(key)) { err(`images: record for unknown slug "${key}"`); continue; }
    if (!safeImageUrl(rec.src)) err(`images.${key}: src is not an https upload.wikimedia.org URL`);
    if (!rec.author || rec.author === 'Unknown author') err(`images.${key}: author missing`);
    if (!rec.license || rec.license === 'Unknown licence') err(`images.${key}: licence missing`);
    if (!safeExternalUrl(rec.page)) err(`images.${key}: page URL invalid`);
  }
  const withImage = species.filter((s) => s.image).length;
  if (withImage < species.length) warnings.push(`images: ${species.length - withImage} of ${species.length} species have no verified image record (run npm run images:fetch with network access)`);

  // config
  const featuredN = config.featured.length;
  if (featuredN < 6 || featuredN > 8) err(`config.featured must hold 6 to 8 species, has ${featuredN}`);
  config.featured.forEach((f) => { if (!slugs.has(f)) err(`config.featured: unknown slug "${f}"`); });
  dupes(config.featured).forEach((d) => err(`config.featured: duplicate "${d}"`));
  config.network.forEach((f) => { if (!slugs.has(f)) err(`config.network: unknown slug "${f}"`); });
  dupes(config.network).forEach((d) => err(`config.network: duplicate "${d}"`));
  if (config.network.length < 8 || config.network.length > 20) err('config.network should hold 8 to 20 species so the graph stays readable');
  archived.forEach((a) => { if (slugs.has(a.slug)) err(`archived species "${a.slug}" is also in the catalogue`); });

  // honesty guards
  const codes = new Set(species.map((s) => s.status.code));
  if (codes.size < 2) err('All species share one status: check the data');
  warnings.push(`status: ${species.filter((s) => !s.statusVerified).length} of ${species.length} categories have NOT been re-checked against the live IUCN Red List`);

  return {
    errors,
    warnings,
    stats: { total: species.length, counts, status: Object.fromEntries(['CR', 'EN', 'VU'].map((c) => [c, species.filter((s) => s.status.code === c).length])), archived: archived.map((a) => a.slug), withImage },
  };
}
