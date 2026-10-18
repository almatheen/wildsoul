import Link from 'next/link';
import PageIntro from '../../components/layout/PageIntro';
import Headline from '../../components/ui/Headline';
import { getAllSpecies, getAllCards, THREAT_LABELS, THREAT_EXPLAINERS } from '../../lib/species';

export const metadata = {
  title: 'Conservation',
  description: 'The main threats to the species in the atlas, the responses reported for them, and practical ways to help.',
};

const CHAPTERS = [
  { id: 'habitat', title: ['Habitat', ['destruction ', { em: 'and loss' }]], tags: ['habitat-loss'], intro: 'The most widespread pressure. Land cleared, drained or divided leaves animals with less food, less shelter and fewer ways to move.' },
  { id: 'poaching', title: ['Poaching and', ['illegal ', { em: 'trade' }]], tags: ['hunting-trade', 'snares-bycatch'], intro: 'Direct killing and capture, and the indirect deaths of animals caught in snares and nets meant for something else.' },
  { id: 'climate', title: ['Climate', [{ em: 'change' }]], tags: ['climate'], intro: 'Shifting temperatures, ice and ocean conditions change where a species can live and what it can eat.' },
  { id: 'other', title: ['Pollution and', ['other documented ', { em: 'threats' }]], tags: ['pollution', 'invasive-disease', 'human-conflict', 'small-population', 'collision'], intro: 'A mix of pressures that appear repeatedly in the project dataset.' },
];

const ACTIONS = [
  ['Support accountable work', 'Back conservation groups that publish their methods and results, and favour protected-area and community programmes with clear reporting.'],
  ['Avoid wildlife products', 'Do not buy tortoiseshell, ivory, fur, or exotic pets of unknown origin. Demand is part of what drives illegal trade.'],
  ['Check what you buy', 'Where independent certification exists for palm oil, paper or seafood, it is a better signal than a general green claim.'],
  ['Reduce plastic and chemical runoff', 'Less plastic and fewer harsh chemicals reaching drains helps rivers, wetlands and the sea.'],
  ['Learn and report', 'Local wildlife surveys and citizen-science projects are always short of observers.'],
];

export default function ConservationPage() {
  const all = getAllSpecies();
  const cards = getAllCards();
  const bySlug = Object.fromEntries(cards.map((c) => [c.slug, c]));

  return (
    <>
      <PageIntro label="Conservation" lines={['Why species decline,', ['and what ', { em: 'helps' }]]}>
        Each section separates three kinds of statement: <b className="font-medium text-ivory">explanations</b> of how a threat works, <b className="font-medium text-ivory">facts from the project dataset</b> (marked unverified), and <b className="font-medium text-ivory">recommendations</b>.
      </PageIntro>

      {CHAPTERS.map((c, ci) => {
        const light = ci % 2 === 1;
        return (
          <section key={c.id} id={c.id} className={`${light ? 'on-light bg-ivory text-forest' : ci === 0 ? 'bg-forest' : 'bg-forest-2'} py-24`}>
            <div className="mx-auto w-[min(1320px,100%-36px)] sm:w-[min(1320px,100%-56px)]">
              <span className="label" data-fade>Chapter 0{ci + 1}</span>
              <Headline className="mb-6 mt-4 text-[clamp(2.4rem,5.4vw,4.8rem)]" lines={c.title} />
              <p className={`mb-14 max-w-[620px] ${light ? 'text-[#3b4a40]' : 'text-muted'}`} data-fade>{c.intro}</p>

              <div className="grid gap-12 lg:grid-cols-2">
                {c.tags.map((tag) => {
                  const hit = all.filter((s) => s.threatTags.includes(tag));
                  return (
                    <article key={tag} id={tag} className="scroll-mt-28" data-fade>
                      <h3 className="font-serif text-[1.8rem] font-light">{THREAT_LABELS[tag]}</h3>
                      <p className={`mt-1 text-[.66rem] uppercase tracking-[.2em] ${light ? 'text-forest-3' : 'text-lime'}`}>Explanation</p>
                      <p className={`mt-1 ${light ? 'text-[#3b4a40]' : 'text-muted'}`}>{THREAT_EXPLAINERS[tag]}</p>
                      <p className={`mt-6 flex items-center gap-3 text-[.66rem] uppercase tracking-[.2em] ${light ? 'text-forest-3' : 'text-lime'}`}>In this atlas <span className="unverified-pill">Dataset · unverified</span></p>
                      <p className={`mt-1 text-[.88rem] ${light ? 'text-[#3b4a40]' : 'text-muted'}`}>{hit.length} of {all.length} species are tagged with this threat:</p>
                      <ul className="mt-3 flex flex-wrap gap-2">
                        {hit.map((s) => (
                          <li key={s.slug}><Link href={`/species/${s.slug}`} className={`chip inline-block ${light ? '!border-forest/25 !text-forest hover:!bg-forest hover:!text-ivory' : ''}`}>{s.name}</Link></li>
                        ))}
                      </ul>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        );
      })}

      <section className="bg-forest py-28" id="responses">
        <div className="mx-auto w-[min(1320px,100%-36px)] sm:w-[min(1320px,100%-56px)]">
          <span className="label" data-fade>Reported responses</span>
          <Headline className="mb-4 mt-4 text-[clamp(2.4rem,5vw,4.4rem)]" lines={['What has been ', { em: 'tried' }]} />
          <p className="mb-12 max-w-[640px] text-muted" data-fade>
            One reported intervention per species, taken from the project dataset. None has a source or date attached yet, and a reported intervention is not evidence of recovery. Every species here is still listed as threatened.
          </p>
          <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3" data-fade>
            {all.map((s) => (
              <li key={s.slug} className="flex flex-col rounded-2xl border border-white/10 p-6">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <Link href={`/species/${s.slug}`} className="font-serif text-[1.3rem] font-light hover:text-lime">{s.name}</Link>
                  <span className="unverified-pill">Unverified</span>
                </div>
                <p className="text-[.88rem] text-muted">{s.conservationWin}</p>
                <p className="mt-auto pt-4 text-[.66rem] uppercase tracking-[.16em] text-botanical">Status: {s.status.label}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="on-light rounded-t-[48px] bg-ivory py-28 text-forest" id="actions">
        <div className="mx-auto w-[min(1320px,100%-36px)] sm:w-[min(1320px,100%-56px)]">
          <span className="label" data-fade>Recommendations</span>
          <Headline className="mb-4 mt-4 text-[clamp(2.4rem,5vw,4.4rem)]" lines={['What you can ', { em: 'do' }]} />
          <p className="mb-12 max-w-[600px] text-[#3b4a40]" data-fade>These are suggestions, not claims about measured impact.</p>
          <ol className="grid gap-px overflow-hidden rounded-2xl border border-forest/15 bg-forest/15 md:grid-cols-2" data-fade>
            {ACTIONS.map(([t, d], i) => (
              <li key={t} className="bg-ivory p-7">
                <span className="font-serif text-[2rem] font-light italic text-forest-3">0{i + 1}</span>
                <h3 className="mt-2 font-serif text-[1.4rem] font-light">{t}</h3>
                <p className="mt-2 text-[.92rem] text-[#3b4a40]">{d}</p>
              </li>
            ))}
          </ol>
          <Link href="/species" className="btn btn-dark mt-12" data-fade>Meet the species <span className="arr" aria-hidden="true">→</span></Link>
        </div>
      </section>
    </>
  );
}
