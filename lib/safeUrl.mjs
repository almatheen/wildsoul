
/** URL helpers. External links and image sources are validated before they are rendered. */

const IMAGE_HOSTS = [
  'upload.wikimedia.org',
  'thumb.wikimedia.org',
];

/**
 * Returns the URL string only if it is a well-formed
 * HTTP(S) URL without credentials; otherwise null.
 */
export function safeExternalUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) {
    return null;
  }

  try {
    const u = new URL(value);

    if (u.protocol !== 'https:' && u.protocol !== 'http:') {
      return null;
    }

    if (u.username || u.password) {
      return null;
    }

    return u.toString();
  } catch {
    return null;
  }
}

/**
 * Image URLs are accepted only over HTTPS from an allowlisted host.
 */
export function safeImageUrl(value, hosts = IMAGE_HOSTS) {
  const s = safeExternalUrl(value);

  if (!s) {
    return null;
  }

  const u = new URL(s);

  return u.protocol === 'https:' && hosts.includes(u.hostname)
    ? s
    : null;
}
