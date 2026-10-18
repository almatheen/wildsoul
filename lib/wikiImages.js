/**
 * Client-side progressive enhancement: when a species has no verified local image record
 * (data/species-images.json), fetch the lead image of its Wikipedia article.
 * Requests are batched into one API call and cached for the session.
 * This runs only in the browser; if it fails the UI shows a labelled placeholder.
 */
const cache = new Map();
let queue = [];
let timer = null;

export function fetchWikiImage(title) {
  if (!title) return Promise.resolve(null);
  if (cache.has(title)) return cache.get(title);
  const p = new Promise((resolve) => {
    queue.push({ title, resolve });
    if (!timer) timer = setTimeout(flush, 25);
  });
  cache.set(title, p);
  return p;
}

async function flush() {
  const batch = queue;
  queue = [];
  timer = null;
  try {
    const url =
      'https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&redirects=1' +
      '&prop=pageimages&piprop=thumbnail&pithumbsize=1280&titles=' +
      encodeURIComponent([...new Set(batch.map((b) => b.title))].join('|'));
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    const json = await res.json();
    const q = json.query || {};
    const alias = {};
    [...(q.normalized || []), ...(q.redirects || [])].forEach((m) => { alias[m.from] = m.to; });
    const pages = Object.values(q.pages || {});
    batch.forEach(({ title, resolve }) => {
      let t = title;
      for (let i = 0; i < 3 && alias[t]; i++) t = alias[t];
      const page = pages.find((p) => p.title === t);
      resolve(page?.thumbnail?.source ? { src: page.thumbnail.source } : null);
    });
  } catch {
    batch.forEach(({ resolve }) => resolve(null));
  }
}
