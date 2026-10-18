// Plain-data labels with no heavy imports, safe for client components.
import enrichment from '../data/species-enrichment.json';

export const HABITAT_LABELS = enrichment.habitatTags;
export const THREAT_LABELS = Object.fromEntries(
  Object.entries(enrichment.threatTags).map(([k, v]) => [k, v.label])
);
