/**
 * Resolve a lead photograph, author and licence for every species.
 *
 * npm run images:fetch
 * npm run images:fetch -- --dry
 *
 * Uses Wikipedia and Wikimedia Commons APIs.
 * Fallbacks are attempted for selected species when the lead image
 * cannot be used. All images remain reviewed:false until checked.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

import { buildCatalogue } from '../lib/catalogue.mjs';
import {
  parsePageImages,
  parseCommons,
  buildRecord,
  chunk,
} from '../lib/imageMeta.mjs';

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

const UA =
  'WildSoul/6.0 (educational species atlas; https://example.org/wildsoul-contact)';

/**
 * These are candidate Commons files, not trusted metadata.
 * The Commons API must still supply their URLs, authors and licences.
 */
const FALLBACK_FILES = {
  'monarch-butterfly':
    'File:Monarch Butterfly Danaus plexippus Male 3941.jpg',
  'elkhorn-coral':
    'File:Acropora palmata.jpg',
};

const read = (p) =>
  JSON.parse(readFileSync(path.join(root, p), 'utf8'));

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function api(base, params, attempt = 0) {
  const url = `${base}?${new URLSearchParams({
    format: 'json',
    formatversion: '2',
    maxlag: '5',
    ...params,
  })}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': UA,
      'Api-User-Agent': UA,
    },
  });

  if (
    (response.status === 429 || response.status >= 500) &&
    attempt < 3
  ) {
    const retryAfter =
      Number(response.headers.get('retry-after')) * 1000;

    await sleep(retryAfter || 1500 * (attempt + 1));
    return api(base, params, attempt + 1);
  }

  if (!response.ok) {
    throw new Error(
      `${response.status} ${response.statusText} for ${base}`,
    );
  }

  const json = await response.json();

  if (json.error?.code === 'maxlag' && attempt < 3) {
    await sleep(2000);
    return api(base, params, attempt + 1);
  }

  if (json.error) {
    throw new Error(
      `API error ${json.error.code}: ${json.error.info}`,
    );
  }

  return json;
}

function pagesByTitle(response) {
  const pages = response.query?.pages;

  if (Array.isArray(pages)) {
    return pages;
  }

  return Object.values(pages || {});
}

function findCommonsMetadata(file, metadata) {
  const normalize = (value) =>
    String(value || '')
      .replace(/^File:/i, '')
      .replace(/_/g, ' ')
      .trim()
      .toLowerCase();

  const wanted = normalize(file);

  return (
    metadata[file] ||
    metadata[file.replace(/_/g, ' ')] ||
    Object.entries(metadata).find(
      ([title]) => normalize(title) === wanted,
    )?.[1] ||
    null
  );
}

function findCommonsImageInfo(file, imageInfoByTitle) {
  const normalize = (value) =>
    String(value || '')
      .replace(/^File:/i, '')
      .replace(/_/g, ' ')
      .trim()
      .toLowerCase();

  const wanted = normalize(file);

  return (
    imageInfoByTitle[normalize(file)] ||
    Object.values(imageInfoByTitle).find(
      (item) => normalize(item.title) === wanted,
    ) ||
    null
  );
}

function makeFallbackPage(info, wikiTitle) {
  if (!info?.url) {
    return null;
  }

  const thumbnailUrl = info.thumburl || info.url;

  return {
    title: wikiTitle,
    thumbnail: {
      source: thumbnailUrl,
      width: info.thumbwidth || info.width,
      height: info.thumbheight || info.height,
    },
    original: {
      source: info.url,
      width: info.width,
      height: info.height,
    },
  };
}

async function main() {
  const dry = process.argv.includes('--dry');

  const config = read('data/catalogue.json');

  const { species } = buildCatalogue({
    legacy: read('data/species-dataset.json'),
    enrichment: read('data/species-enrichment.json'),
    additions: read('data/species-additions.json'),
    images: {},
    config,
  });

  const existing = read('data/species-images.json');

  // Keep the existing records for species that cannot be resolved.
  const result = { ...existing };
  delete result._fetchedAt;

  const rows = [];

  for (const group of chunk(species, 20)) {
    const response = await api(
      'https://en.wikipedia.org/w/api.php',
      {
        action: 'query',
        redirects: '1',
        prop: 'pageimages',
        piprop: 'original|thumbnail|name',
        pithumbsize: '1280',
        titles: group.map((item) => item.wiki).join('|'),
      },
    );

    const findPage = parsePageImages({
      query: {
        ...response.query,
        pages: Array.isArray(response.query?.pages)
          ? Object.fromEntries(
              response.query.pages.map((page, index) => [
                index,
                page,
              ]),
            )
          : response.query?.pages,
      },
    });

    for (const item of group) {
      const page = findPage(item.wiki);

      rows.push({
        species: item,
        page,
        file: page?.pageimage
          ? `File:${page.pageimage}`
          : null,
      });
    }

    await sleep(300);
  }

  // Request metadata for both lead images and fallback candidates.
  const files = [
    ...new Set([
      ...rows.map((row) => row.file).filter(Boolean),
      ...Object.values(FALLBACK_FILES),
    ]),
  ];

  let commons = {};
  const imageInfoByTitle = {};

  for (const group of chunk(files, 20)) {
    const response = await api(
      'https://commons.wikimedia.org/w/api.php',
      {
        action: 'query',
        prop: 'imageinfo',
        iiprop: 'extmetadata|url',
        iiurlwidth: '1280',
        iiextmetadatafilter:
          'Artist|Credit|LicenseShortName|LicenseUrl',
        titles: group.join('|'),
      },
    );

    const pages = pagesByTitle(response);

    const pageMap = Object.fromEntries(
      pages.map((page, index) => [index, page]),
    );

    commons = {
      ...commons,
      ...parseCommons({
        query: { pages: pageMap },
      }),
    };

    for (const page of pages) {
      const info = page.imageinfo?.[0];

      if (!info) continue;

      const key = String(page.title || '')
        .replace(/^File:/i, '')
        .replace(/_/g, ' ')
        .trim()
        .toLowerCase();

      imageInfoByTitle[key] = {
        ...info,
        title: page.title,
      };
    }

    await sleep(300);
  }

  const missing = [];
  let added = 0;
  let fallbackCount = 0;

  for (const row of rows) {
    const { species: item, page, file } = row;

    let output = buildRecord({
      page,
      meta: file ? findCommonsMetadata(file, commons) : null,
      file,
      wikiTitle: item.wiki,
    });

    // If the lead image is unusable, try the configured Commons file.
    if (!output.record && FALLBACK_FILES[item.slug]) {
      const fallbackFile = FALLBACK_FILES[item.slug];
      const info = findCommonsImageInfo(
        fallbackFile,
        imageInfoByTitle,
      );
      const fallbackPage = makeFallbackPage(info, item.wiki);
      const fallbackMeta = findCommonsMetadata(
        fallbackFile,
        commons,
      );

      if (fallbackPage && fallbackMeta) {
        const fallbackOutput = buildRecord({
          page: fallbackPage,
          meta: fallbackMeta,
          file: fallbackFile,
          wikiTitle: item.wiki,
        });

        if (fallbackOutput.record) {
          output = fallbackOutput;
          fallbackCount += 1;
        } else {
          missing.push(
            `${item.slug} (${item.wiki}): fallback rejected: ${fallbackOutput.reason}`,
          );
          continue;
        }
      } else {
        missing.push(
          `${item.slug} (${item.wiki}): fallback file metadata or image URL unavailable`,
        );
        continue;
      }
    }

    if (output.record) {
      const previous = existing[item.slug];

      result[item.slug] = {
        ...output.record,
        reviewed:
          Boolean(previous?.reviewed) &&
          previous.src === output.record.src,
      };

      added += 1;
    } else {
      missing.push(
        `${item.slug} (${item.wiki}): ${output.reason}`,
      );
    }
  }

  result._readme =
    'Written by scripts/fetch-images.mjs. Every record is reviewed:false until a person has looked at the image and confirmed it shows the right species. Records only exist for files with a known author and a reuse-friendly licence.';

  result._fetchedAt = new Date().toISOString();

  console.log(`Resolved ${added}/${species.length} image records.`);
  console.log(`Fallback images used: ${fallbackCount}`);

  if (missing.length) {
    console.warn(
      'No usable image for:\n  - ' + missing.join('\n  - '),
    );
  }

  if (dry) {
    console.log('Dry run: nothing written.');
    return;
  }

  writeFileSync(
    path.join(root, 'data/species-images.json'),
    JSON.stringify(result, null, 2) + '\n',
  );

  console.log(
    'Wrote data/species-images.json. Review each image by eye, then set "reviewed": true.',
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    console.error(`images:fetch failed: ${error.message}`);
    process.exit(1);
  });
}
