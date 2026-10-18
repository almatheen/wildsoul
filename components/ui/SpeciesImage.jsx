'use client';
import { useState } from 'react';
import useSpeciesImageSrc from '../../lib/useSpeciesImageSrc';

/**
 * Fills its (relatively positioned) parent. Order of preference:
 *   1. verified local record (data/species-images.json)
 *   2. runtime Wikipedia lead image (progressive enhancement)
 *   3. labelled placeholder, never a random stock photo
 */
export default function SpeciesImage({ species, priority = false, className = '', zoomOnHover = false, fit = 'cover' }) {
  const src = useSpeciesImageSrc(species);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const showImg = src && !failed;
  return (
    <div className={`ph ${className}`} data-loaded={loaded}>
      <div className="ph-fallback" aria-hidden={showImg && loaded ? 'true' : undefined}>
        <svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice" fill="none" stroke="currentColor" strokeWidth=".6" aria-hidden="true">
          {[20, 36, 52, 68, 84, 100, 116].map((r, i) => (
            <ellipse key={r} cx={100 + (i % 2) * 6} cy={110} rx={r * 1.15} ry={r * 0.8} />
          ))}
        </svg>
        <strong className="relative">{species.name}</strong>
        <span className="relative">{showImg ? 'Loading photograph' : 'Photograph unavailable'}</span>
      </div>
      {showImg && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={`${species.name} (${species.scientificName})`}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          referrerPolicy="no-referrer"
          className={`${loaded ? 'loaded' : ''} ${zoomOnHover ? 'group-hover:scale-[1.07] group-focus-visible:scale-[1.07]' : ''}`}
          style={{ objectFit: fit }}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
