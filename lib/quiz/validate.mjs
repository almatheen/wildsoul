/**
 * Validates the quiz bank against the shared dataset.
 * Machine checks prove the dataset supports the keyed answer and contradicts every distractor.
 * `curated` questions are general-knowledge facts the dataset cannot prove; they are counted and reported.
 */
import { THREAT_LABELS_FALLBACK } from './labels.mjs';

const VALID_STATUS_LABELS = ['Critically Endangered', 'Endangered', 'Vulnerable', 'Near Threatened', 'Least Concern'];
const BANNED_PROMPT = /\b(population|how many|individuals remain|your location|where are you|click the map|drop a pin|guess where|which country)\b/i;
// Years (1800-2099) are fine; other numbers of three or more digits are not (they would be population-style figures).
const THREE_DIGITS = /\b(?!(?:1[89]|20)\d{2}\b)\d{3,}\b/;

export function validateQuizBank(bank, species, labels = THREAT_LABELS_FALLBACK) {
  const errors = [];
  const warnings = [];
  const err = (m) => errors.push(m);
  const bySlug = Object.fromEntries(species.map((s) => [s.slug, s]));
  let machine = 0;
  let curated = 0;
  let total = 0;

  if (bank.levels.length !== 6) err(`Expected 6 levels, found ${bank.levels.length}`);
  const ids = [];
  const prompts = [];

  bank.levels.forEach((lv, li) => {
    if (lv.level !== li + 1) err(`Level order broken at index ${li}`);
    if (!lv.title || !lv.theme) err(`Level ${lv.level}: title/theme missing`);
    if (lv.questions.length !== 5) err(`Level ${lv.level}: expected 5 questions, found ${lv.questions.length}`);

    lv.questions.forEach((q, qi) => {
      total += 1;
      const at = q.id;
      if (q.id !== `L${lv.level}Q${qi + 1}`) err(`${at}: id does not match its position (expected L${lv.level}Q${qi + 1})`);
      ids.push(q.id);
      prompts.push(q.prompt.trim().toLowerCase());
      if (!q.prompt?.trim()) err(`${at}: empty prompt`);
      if (BANNED_PROMPT.test(q.prompt) || q.options.some((o) => BANNED_PROMPT.test(o.label))) err(`${at}: prompt or option uses a banned pattern (population figures or location guessing)`);
      if (THREE_DIGITS.test(q.prompt) || q.options.some((o) => THREE_DIGITS.test(o.label))) err(`${at}: prompt/options contain a number of 3+ digits (quiz must not depend on figures)`);
      if (!q.explanation?.trim()) err(`${at}: explanation missing`);
      if (!Array.isArray(q.options) || q.options.length !== 4) { err(`${at}: needs exactly 4 options`); return; }
      if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) { err(`${at}: answer index invalid`); return; }
      const labelsLower = q.options.map((o) => o.label.trim().toLowerCase());
      if (new Set(labelsLower).size !== 4) err(`${at}: duplicate option labels`);
      if (q.options.some((o) => !o.label?.trim())) err(`${at}: empty option label`);
      const subject = bySlug[q.subject];
      if (!subject) { err(`${at}: unknown subject "${q.subject}"`); return; }

      q.options.forEach((o) => {
        if (o.slug) {
          const s = bySlug[o.slug];
          if (!s) err(`${at}: option slug "${o.slug}" is not in the catalogue`);
          else if (s.name !== o.label) err(`${at}: option label "${o.label}" differs from species name "${s.name}"`);
        }
      });
      const right = q.options[q.answer];
      const wrong = q.options.filter((_, i) => i !== q.answer);
      const speciesOf = (o) => (o.slug ? bySlug[o.slug] : null);
      const c = q.check || {};

      const expectAll = (cond, what) => { if (!cond) err(`${at}: ${what}`); };
      switch (c.type) {
        case 'group': {
          machine += 1;
          expectAll(speciesOf(right)?.group === c.group, `keyed answer is not in group ${c.group}`);
          wrong.forEach((o) => expectAll(speciesOf(o) && speciesOf(o).group !== c.group, `distractor "${o.label}" is in group ${c.group} or is not a species`));
          break;
        }
        case 'status': {
          machine += 1;
          expectAll(speciesOf(right)?.status.code === c.code, `keyed answer is not ${c.code}`);
          wrong.forEach((o) => expectAll(speciesOf(o) && speciesOf(o).status.code !== c.code, `distractor "${o.label}" is also ${c.code}`));
          break;
        }
        case 'habitatTag': {
          machine += 1;
          expectAll(speciesOf(right)?.habitatTags.includes(c.tag), `keyed answer lacks habitat tag ${c.tag}`);
          wrong.forEach((o) => expectAll(speciesOf(o) && !speciesOf(o).habitatTags.includes(c.tag), `distractor "${o.label}" also has habitat tag ${c.tag}`));
          break;
        }
        case 'evidence': {
          machine += 1;
          const has = (s) => String(s?.[c.field] ?? '').toLowerCase().includes(c.includes.toLowerCase());
          expectAll(has(speciesOf(right)), `dataset field "${c.field}" of the keyed answer does not include "${c.includes}"`);
          wrong.forEach((o) => expectAll(speciesOf(o) && !has(speciesOf(o)), `dataset field "${c.field}" of distractor "${o.label}" also includes "${c.includes}"`));
          break;
        }
        case 'threatTag': {
          machine += 1;
          expectAll(right.tag === c.tag && subject.threatTags.includes(c.tag), 'keyed threat tag is not a tag of the subject');
          expectAll(right.label === labels[c.tag], 'keyed option label differs from the threat label');
          wrong.forEach((o) => expectAll(o.tag && !subject.threatTags.includes(o.tag) && o.label === labels[o.tag], `distractor "${o.label}" is a threat of the subject or has an unknown tag`));
          break;
        }
        case 'scientificName': {
          machine += 1;
          const names = new Set(species.map((s) => s.scientificName));
          expectAll(right.label === subject.scientificName, 'keyed answer is not the subject’s scientific name');
          wrong.forEach((o) => expectAll(names.has(o.label) && o.label !== subject.scientificName, `distractor "${o.label}" is not another dataset scientific name`));
          break;
        }
        case 'family':
        case 'order':
        case 'genus': {
          machine += 1;
          const rank = c.type;
          const values = new Set(species.map((s) => s.taxonomy[rank]));
          expectAll(right.label === subject.taxonomy[rank], `keyed answer is not the subject’s ${rank}`);
          if (c.also) expectAll(bySlug[c.also]?.taxonomy[rank] === subject.taxonomy[rank], `"${c.also}" does not share the ${rank}`);
          wrong.forEach((o) => expectAll(values.has(o.label) && o.label !== subject.taxonomy[rank], `distractor "${o.label}" is not another dataset ${rank}`));
          if (c.type === 'family' && !new Set(species.filter((s) => s.group === subject.group).map((s) => s.taxonomy.family)).has(right.label)) err(`${at}: family is not in subject's group`);
          break;
        }
        case 'statusLabel': {
          machine += 1;
          expectAll(right.label === subject.status.label, 'keyed answer is not the subject’s status label');
          wrong.forEach((o) => expectAll(VALID_STATUS_LABELS.includes(o.label) && o.label !== subject.status.label, `distractor "${o.label}" is not a different real IUCN category`));
          break;
        }
        case 'nameForScientific': {
          machine += 1;
          expectAll(q.prompt.includes(subject.scientificName), 'prompt does not contain the subject’s scientific name');
          expectAll(right.slug === subject.slug, 'keyed answer is not the subject species');
          wrong.forEach((o) => expectAll(speciesOf(o) && speciesOf(o).slug !== subject.slug, `distractor "${o.label}" is invalid`));
          break;
        }
        case 'curated': {
          curated += 1;
          const req = c.requires || {};
          if (req.subjectThreatTag) expectAll(subject.threatTags.includes(req.subjectThreatTag), `subject lacks threat tag ${req.subjectThreatTag}`);
          warnings.push(`${at}: curated general-knowledge fact (not machine-verifiable); needs human review`);
          break;
        }
        default:
          err(`${at}: unknown check type "${c.type}"`);
      }
      if (q.options.some((o) => o.slug === q.subject) && right.slug !== q.subject && c.type !== 'status') warnings.push(`${at}: subject appears as a distractor`);
    });
  });

  if (total !== 30) err(`Expected 30 questions, found ${total}`);
  new Set(ids.filter((v, i) => ids.indexOf(v) !== i)).forEach((d) => err(`Duplicate question id ${d}`));
  new Set(prompts.filter((v, i) => prompts.indexOf(v) !== i)).forEach((d) => err(`Duplicate prompt "${d}"`));
  const subjCount = {};
  bank.levels.forEach((lv) => lv.questions.forEach((q) => { subjCount[q.subject] = (subjCount[q.subject] || 0) + 1; }));
  Object.entries(subjCount).filter(([, n]) => n > 2).forEach(([s, n]) => warnings.push(`subject "${s}" is used by ${n} questions`));

  return { errors, warnings, stats: { questions: total, machineChecked: machine, curated } };
}
