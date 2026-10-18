#!/usr/bin/env node
/**
 * Data integrity check. Run with: npm run check:data
 * Exits 1 on structural problems. Prints warnings for data-quality limits.
 * It validates structure and internal consistency; it cannot confirm that a fact is true.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildCatalogue } from '../lib/catalogue.mjs';
import { validateCatalogue } from '../lib/validateCatalogue.mjs';
import { validateQuizBank } from '../lib/quiz/validate.mjs';
import bank from '../lib/quiz/bank.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(readFileSync(path.join(root, p), 'utf8'));

const config = read('data/catalogue.json');
const enrichment = read('data/species-enrichment.json');
const images = read('data/species-images.json');
const { species, archived } = buildCatalogue({
  legacy: read('data/species-dataset.json'), enrichment, additions: read('data/species-additions.json'), images, config,
});

const result = validateCatalogue({ species, archived, config, enrichment, images, target: config.target });
const quiz = validateQuizBank(bank, species);

console.log(`Species: ${result.stats.total}`);
console.log('Per group:', Object.entries(result.stats.counts).map(([g, n]) => `${g} ${n}`).join(' | '));
console.log('Status:', Object.entries(result.stats.status).map(([c, n]) => `${c} ${n}`).join(' | '));
console.log('Archived (kept in source data, not in the catalogue):', result.stats.archived.join(', ') || 'none');
console.log(`Quiz: ${bank.levels.length} levels, ${quiz.stats.questions} questions, machine-checked against the dataset: ${quiz.stats.machineChecked}, curated facts: ${quiz.stats.curated}`);

const warnings = [...result.warnings, ...quiz.warnings];
const errors = [...result.errors, ...quiz.errors];
if (warnings.length) { console.log(`\nWarnings (${warnings.length}):`); warnings.forEach((w) => console.log('  - ' + w)); }
if (errors.length) { console.error(`\nErrors (${errors.length}):`); errors.forEach((x) => console.error('  - ' + x)); process.exit(1); }
console.log('\nData check passed (structure and internal consistency only; factual accuracy is NOT verified by this script).');
