/**
 * Single source of truth for species data (see lib/catalogue.mjs for the layers and the build logic).
 * Every page, filter, chart, quiz question and link derives from this module.
 */
import legacy from '../data/species-dataset.json';
import enrichment from '../data/species-enrichment.json';
import additions from '../data/species-additions.json';
import imageRecords from '../data/species-images.json';
import config from '../data/catalogue.json';
import {
  STATUS, GROUP_DEFS, buildCatalogue, closestRank, relationsFor, groupsFor, groupByTagFor, pick,
} from './catalogue.mjs';

export { STATUS, GROUP_DEFS, closestRank };

export const HABITAT_LABELS = enrichment.habitatTags;
export const THREAT_LABELS = Object.fromEntries(Object.entries(enrichment.threatTags).map(([k, v]) => [k, v.label]));
export const THREAT_EXPLAINERS = Object.fromEntries(Object.entries(enrichment.threatTags).map(([k, v]) => [k, v.explainer]));

const { species: ALL, archived: ARCHIVED } = buildCatalogue({ legacy, enrichment, additions, images: imageRecords, config });
const BY_SLUG = Object.fromEntries(ALL.map((s) => [s.slug, s]));

export const getAllSpecies = () => ALL;
export const getSpecies = (slug) => BY_SLUG[slug] || null;
export const getSlugs = () => ALL.map((s) => s.slug);
export const getArchived = () => ARCHIVED;
export const getFeatured = () => pick(ALL, config.featured, 'featured');
export const getNetworkSet = () => pick(ALL, config.network, 'network');

/** Small projection safe to send to client components. */
export function toCard(s) {
  return {
    slug: s.slug,
    level: s.level,
    name: s.name,
    scientificName: s.scientificName,
    statusCode: s.status.code,
    statusLabel: s.status.label,
    statusRank: s.status.rank,
    group: s.group,
    class: s.taxonomy.class,
    order: s.taxonomy.order,
    family: s.taxonomy.family,
    genus: s.taxonomy.genus,
    habitatTags: s.habitatTags,
    threatTags: s.threatTags,
    tagline: s.tagline,
    region: s.region,
    wiki: s.wiki,
    image: s.image,
  };
}

export const getAllCards = () => ALL.map(toCard);

export function getAdjacent(slug) {
  const i = ALL.findIndex((s) => s.slug === slug);
  return { prev: ALL[(i - 1 + ALL.length) % ALL.length], next: ALL[(i + 1) % ALL.length] };
}

export const getRelations = (slug) => relationsFor(ALL, slug, { habitat: HABITAT_LABELS, threat: THREAT_LABELS });
export const getGroups = () => groupsFor(ALL);
export const groupByTag = (field) => groupByTagFor(ALL, field);

export function imageCredit(s) {
  if (!s.image) return null;
  const { author, license, licenseUrl, page } = s.image;
  return { author, license, licenseUrl, page };
}
