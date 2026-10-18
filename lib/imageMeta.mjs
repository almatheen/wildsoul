
/**
 * Pure helpers for the image pipeline.
 *
 * Used by scripts/fetch-images.mjs and unit-tested with mocked API responses.
 * Live behaviour against Wikipedia and Wikimedia Commons must be verified
 * separately.
 */

import { safeExternalUrl, safeImageUrl } from './safeUrl.mjs';

/**
 * Strip HTML tags and decode common HTML entities in API metadata.
 */
export const stripHtml = (value) =>
  String(value ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Licences accepted by this project's image pipeline.
 * Reject unknown or restrictive licences rather than guessing.
 */
const ALLOWED_LICENSES = [
  /^cc0(?:\b|$)/i,
  /^cc[- ]by(?:[- ]sa)?(?:\b|$)/i,
  /^public domain(?:\b|$)/i,
  /^pd(?:\b|$)/i,
  /^pdm(?:\b|$)/i,
  /^no restrictions(?:\b|$)/i,
];

const BLOCKED_LICENSES =
  /\bnon[- ]commercial\b|\bno[- ]derivatives\b|\bno[- ]derivs\b|\bfair use\b|\ball rights reserved\b|\bcopyrighted\b|\bCC\s*BY[- ](?:NC|ND)\b/i;

/**
 * Determine whether a licence name is on the project's reuse allowlist.
 */
export function isAllowedLicense(name) {
  const normalized = String(name ?? '').trim();

  if (!normalized || BLOCKED_LICENSES.test(normalized)) {
    return false;
  }

  return ALLOWED_LICENSES.some((pattern) => pattern.test(normalized));
}

/**
 * Return a function that resolves an article title to its page record,
 * taking Wikipedia title normalization and redirects into account.
 */
export function parsePageImages(json) {
  const query = json?.query ?? {};
  const aliases = {};

  [...(query.normalized ?? []), ...(query.redirects ?? [])].forEach(
    ({ from, to }) => {
      if (from && to) aliases[from] = to;
    },
  );

  const resolveTitle = (title) => {
    let current = title;

    // Guard against unexpected alias loops.
    for (let i = 0; i < 10 && aliases[current]; i += 1) {
      current = aliases[current];
    }

    return current;
  };

  const pages = Object.values(query.pages ?? {});

  return (title) => {
    const resolved = resolveTitle(title);

    return pages.find(
      (page) => page.title === resolved || page.title === title,
    );
  };
}

/**
 * Parse Commons image metadata.
 *
 * Keep only safe external URLs. An unknown author or licence remains empty
 * so buildRecord can reject that record.
 */
export function parseCommons(json) {
  const result = {};

  Object.values(json?.query?.pages ?? {}).forEach((page) => {
    const info = page?.imageinfo?.[0];

    if (!info || !page?.title) return;

    const metadata = info.extmetadata ?? {};

    const author =
      stripHtml(metadata.Artist?.value) ||
      stripHtml(metadata.Credit?.value) ||
      '';

    const license = stripHtml(metadata.LicenseShortName?.value);

    result[page.title] = {
      author,
      license,
      licenseUrl: safeExternalUrl(metadata.LicenseUrl?.value) || null,
      commonsPage: safeExternalUrl(info.descriptionurl) || null,
    };
  });

  return result;
}

/**
 * Diagnose an image URL rejected by the project's safe-image policy.
 * Do not include URL query parameters, which can contain unnecessary data.
 */
function describeRejectedImageUrl(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return 'image URL is missing or is not a string';
  }

  try {
    const parsed = new URL(value);

    return [
      `protocol=${parsed.protocol}`,
      `host=${parsed.hostname}`,
      `path=${parsed.pathname.slice(0, 100)}`,
    ].join(', ');
  } catch {
    return 'image URL is malformed';
  }
}

/**
 * Build one manifest record, or return a reason explaining why it was rejected.
 *
 * Only HTTPS upload.wikimedia.org image URLs accepted by safeImageUrl are
 * permitted. Unknown authors and unsupported licences are rejected.
 */
export function buildRecord({ page, meta, file, wikiTitle }) {
  const thumbnail = page?.thumbnail;
  const imageUrl = thumbnail?.source;

  if (!imageUrl) {
    return {
      reason: 'no lead image on the Wikipedia article',
    };
  }

  const safeThumbnailUrl = safeImageUrl(imageUrl);

  if (!safeThumbnailUrl) {
    return {
      reason: `image URL rejected: must use HTTPS on upload.wikimedia.org; ${describeRejectedImageUrl(imageUrl)}`,
    };
  }

  if (!meta) {
    return {
      reason: 'no Commons metadata for the file',
    };
  }

  const author = String(meta.author ?? '').trim();
  const license = String(meta.license ?? '').trim();

  if (!author) {
    return {
      reason: 'author unknown',
    };
  }

  if (!license) {
    return {
      reason: 'licence unknown',
    };
  }

  if (!isAllowedLicense(license)) {
    return {
      reason: `licence "${license}" is not on the reuse allowlist`,
    };
  }

  const safeOriginalUrl = safeImageUrl(page?.original?.source);

  const commonsPage =
    safeExternalUrl(meta.commonsPage) ||
    `https://commons.wikimedia.org/wiki/${encodeURIComponent(
      String(file ?? '').replace(/ /g, '_'),
    )}`;

  const articleTitle = String(wikiTitle ?? '').replace(/ /g, '_');

  return {
    record: {
      src: safeThumbnailUrl,
      original: safeOriginalUrl || null,
      width: Number.isFinite(thumbnail.width) ? thumbnail.width : null,
      height: Number.isFinite(thumbnail.height) ? thumbnail.height : null,
      author,
      license,
      licenseUrl: safeExternalUrl(meta.licenseUrl) || null,
      page: commonsPage,
      article: `https://en.wikipedia.org/wiki/${encodeURIComponent(
        articleTitle,
      )}`,
      reviewed: false,
    },
  };
}

/**
 * Split an array into batches for API requests.
 */
export const chunk = (items, size) => {
  if (!Array.isArray(items)) {
    throw new TypeError('chunk expects an array');
  }

  if (!Number.isInteger(size) || size < 1) {
    throw new RangeError('chunk size must be a positive integer');
  }

  return Array.from(
    { length: Math.ceil(items.length / size) },
    (_, index) => items.slice(index * size, index * size + size),
  );
};
