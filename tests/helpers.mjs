import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildCatalogue } from '../lib/catalogue.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const read = (p) => JSON.parse(readFileSync(path.join(root, p), 'utf8'));

export function load() {
  const config = read('data/catalogue.json');
  const enrichment = read('data/species-enrichment.json');
  const legacy = read('data/species-dataset.json');
  const additions = read('data/species-additions.json');
  const images = read('data/species-images.json');
  const { species, archived } = buildCatalogue({ legacy, enrichment, additions, images, config });
  return { config, enrichment, legacy, additions, images, species, archived };
}

/** In-memory Storage stand-in. */
export function memoryStorage(initial = {}) {
  const m = new Map(Object.entries(initial));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: (k) => { m.delete(k); }, _m: m };
}
