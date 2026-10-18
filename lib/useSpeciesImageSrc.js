'use client';
import { useEffect, useState } from 'react';
import { fetchWikiImage } from './wikiImages';
import { safeImageUrl } from './safeUrl.mjs';

// Set NEXT_PUBLIC_WIKI_RUNTIME_IMAGES=false to disable live Wikipedia lookups and show only verified manifest images.
const RUNTIME = process.env.NEXT_PUBLIC_WIKI_RUNTIME_IMAGES !== 'false';

/**
 * Returns the best available image URL for a species card, or null.
 * Verified local records win. The live Wikipedia lead image is an unverified progressive enhancement.
 * Every URL is checked against the image host allowlist before use.
 */
export default function useSpeciesImageSrc(species) {
  const local = safeImageUrl(species.image?.src);
  const [src, setSrc] = useState(local);
  useEffect(() => {
    if (local) { setSrc(local); return undefined; }
    if (!RUNTIME) { setSrc(null); return undefined; }
    let live = true;
    fetchWikiImage(species.wiki)
      .then((r) => { const safe = r && safeImageUrl(r.src); if (live && safe) setSrc(safe); })
      .catch(() => {});
    return () => { live = false; };
  }, [local, species.wiki]);
  return src;
}
