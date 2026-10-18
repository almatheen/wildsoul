import { safeExternalUrl } from '../safeUrl.mjs';

/** Small, serialisable lookup the Challenge UI uses for species names, a one-line fact and source links. */
export const factsFor = (species) => Object.fromEntries(species.map((s) => [s.slug, {
  name: s.name,
  tagline: s.tagline,
  sources: s.sources.map((x) => ({ label: x.label, url: safeExternalUrl(x.url) })).filter((x) => x.url),
}]));
