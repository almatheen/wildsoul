import Link from 'next/link';
import { notFound } from 'next/navigation';
import Headline from '../../../components/ui/Headline';
import SpeciesImage from '../../../components/ui/SpeciesImage';
import StatusBadge from '../../../components/ui/StatusBadge';
import HabitatMap from '../../../components/science/HabitatMap';
import PopulationChart from '../../../components/science/PopulationChart';
import AudioDemo from '../../../components/science/AudioDemo';
import RelatedSpecies from '../../../components/species/RelatedSpecies';
import { getSpecies, getSlugs, getRelations, getAdjacent, toCard, HABITAT_LABELS, THREAT_LABELS, getAllSpecies } from '../../../lib/species';
import { safeExternalUrl } from '../../../lib/safeUrl.mjs';

export const dynamicParams = false; // unknown slugs are a 404, never rendered

export function generateStaticParams() {
  return getSlugs().map((slug) => ({ slug }));
}

export function generateMetadata({ params }) {
  const s = getSpecies(params.slug);
  if (!s) return { title: 'Species not found' };
  return { title: s.name, description: `${s.name} (${s.scientificName}), ${s.status.label}. ${s.tagline}` };
}

const Wrap = ({ children, className = '' }) => (
  <div className={`mx-auto w-[min(1320px,100%-36px)] sm:w-[min(1320px,100%-56px)] ${className}`}>{children}</div>
);

function SectionHead({ label, lines, children, light = false }) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-8">
      <div>
        <span className="label" data-fade>{label}</span>
        <Headline lines={lines} className="mt-4 max-w-[760px] text-[clamp(2.2rem,4.6vw,4rem)]" />
      </div>
      {children && <p className={`max-w-[360px] text-[.92rem] ${light ? 'text-[#3b4a40]' : 'text-muted'}`} data-fade>{children}</p>}
    </div>
  );
}

export default function SpeciesPage({ params }) {
  const s = getSpecies(params.slug);
  if (!s) notFound();
  const rel = getRelations(s.slug);
  const iucnUrl = safeExternalUrl(s.sources.find((x) => x.kind === 'iucn-search')?.url);
  const { prev, next } = getAdjacent(s.slug);
  const card = toCard(s);
  const t = s.taxonomy;
  const markers = [{ slug: s.slug, name: s.name, lat: s.geo.lat, lng: s.geo.lng, zoom: s.geo.zoom, locName: s.geo.locName, precision: s.geo.precision }];
  const all = getAllSpecies();
  const wikiSource = safeExternalUrl(s.sources.find((x) => x.kind === 'wikipedia')?.url) || 'https://en.wikipedia.org/';

  return (
    <>
      {/* 1. Cinematic hero */}
      <section data-hero className="relative flex min-h-[92svh] items-end overflow-hidden pb-16 pt-32">
        <div data-hero-media className="absolute inset-0 -z-20">
          <SpeciesImage species={card} priority />
        </div>
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(7,13,10,.7),rgba(7,13,10,.1)_32%,rgba(7,13,10,.6)_72%,#0B1511),linear-gradient(90deg,rgba(7,13,10,.7),transparent_65%)]" />
        <Wrap className="relative" >
          <div data-hero-inner>
            <nav aria-label="Breadcrumb" className="mb-8 text-[.78rem] text-muted" data-hero-fade>
              <ol className="flex flex-wrap items-center gap-2">
                <li><Link className="hover:text-lime" href="/species">Species</Link></li>
                <li aria-hidden="true">/</li>
                <li><Link className="hover:text-lime" href={`/species?group=${encodeURIComponent(s.group)}`}>{s.group}</Link></li>
                <li aria-hidden="true">/</li>
                <li aria-current="page" className="text-ivory">{s.name}</li>
              </ol>
            </nav>
            <div className="hero-rule mb-7 h-px w-[140px] bg-lime" />
            <div data-hero-fade><StatusBadge code={s.status.code} label={s.status.label} /></div>
            <Headline as="h1" hero lines={[s.name]} className="mt-6 text-[clamp(3.2rem,9vw,8.6rem)]" />
            <p className="sci mt-5 text-[clamp(1.1rem,2vw,1.6rem)] text-muted" data-hero-fade>{s.scientificName}</p>
            <dl className="mt-8 grid max-w-[760px] gap-x-10 gap-y-4 sm:grid-cols-2" data-hero-fade>
              <div><dt className="text-[.62rem] uppercase tracking-[.22em] text-botanical">Native region</dt><dd className="text-[.92rem]">{s.region}</dd></div>
              <div><dt className="text-[.62rem] uppercase tracking-[.22em] text-botanical">Habitat</dt><dd className="text-[.92rem]">{s.habitat}</dd></div>
            </dl>
            <p className="mt-6 text-[.62rem] uppercase tracking-[.14em] text-white/45" data-hero-fade>
              {s.image
                ? <>Photo: {s.image.author} · {s.image.license}{safeExternalUrl(s.image.page) && <> · <a className="underline" href={safeExternalUrl(s.image.page)} target="_blank" rel="noopener noreferrer">Wikimedia Commons</a></>}</>
                : <>Photograph: unverified Wikipedia lead image, loaded live when available · author and licence are on the <a className="underline" href={wikiSource} target="_blank" rel="noopener noreferrer">Wikipedia article</a></>}
            </p>
          </div>
        </Wrap>
        <div aria-hidden="true" className="absolute bottom-8 right-7 hidden items-center gap-3 text-[.62rem] uppercase tracking-[.26em] text-muted [writing-mode:vertical-rl] lg:flex">Scroll<span className="cue-line" /></div>
      </section>

      {/* 2. Overview */}
      <section className="bg-forest py-28">
        <Wrap>
          <div className="grid gap-14 lg:grid-cols-[1.25fr_.75fr]">
            <div>
              <span className="label" data-fade>Overview</span>
              <p className="serif mt-6 text-[clamp(1.7rem,3.2vw,2.8rem)] leading-[1.15]" data-fade>{s.tagline}</p>
              <p className="mt-8 max-w-[620px] text-[1.02rem] text-muted" data-fade><strong className="font-medium text-ivory">Ecological role. </strong>{s.ecologicalRole}</p>
              <figure className="mt-10 max-w-[620px] rounded-2xl border border-white/10 p-6" data-fade>
                <span className="unverified-pill">{s.summaryOrigin === 'legacy' ? 'Project narrative · unverified' : 'Project summary · check the references'}</span>
                <blockquote className="mt-3 text-[.95rem] text-muted">{s.summary}</blockquote>
              </figure>
            </div>
            <aside aria-label="Classification" data-fade>
              <h2 className="mb-5 text-[.7rem] font-medium uppercase tracking-[.22em] text-lime">Classification</h2>
              <ol className="border-l border-white/15 pl-6">
                {[['Class', t.class], ['Order', t.order], ['Family', t.family], ['Genus', t.genus]].map(([k, v]) => (
                  <li key={k} className="relative pb-5 last:pb-0">
                    <span aria-hidden="true" className="absolute -left-[30px] top-2 h-2 w-2 rounded-full bg-lime" />
                    <span className="block text-[.62rem] uppercase tracking-[.2em] text-botanical">{k}</span>
                    <span className="font-serif text-[1.35rem] font-light">{v}</span>
                  </li>
                ))}
                <li className="relative pt-5">
                  <span aria-hidden="true" className="absolute -left-[30px] top-7 h-2 w-2 rounded-full border border-lime" />
                  <span className="block text-[.62rem] uppercase tracking-[.2em] text-botanical">Species</span>
                  <span className="sci font-serif text-[1.35rem] font-light">{s.scientificName}</span>
                </li>
              </ol>
              {t.note && <p className="note-box mt-6">{t.note}</p>}
            </aside>
          </div>
        </Wrap>
      </section>

      {/* 3. Status and population */}
      <section className="bg-forest-2 py-28" id="status">
        <Wrap>
          <SectionHead label="Conservation status" lines={['Where this species', ['stands ', { em: 'today' }]]}>
            Status terms follow the IUCN Red List categories. This release records the category only; it does not state a population estimate.
          </SectionHead>
          <div className="grid gap-12 lg:grid-cols-2">
            <div data-fade>
              <StatusBadge code={s.status.code} label={s.status.label} />
              <dl className="mt-6 grid gap-5 text-[.92rem]">
                <div><dt className="text-[.62rem] uppercase tracking-[.2em] text-botanical">Assessed taxon</dt><dd className="mt-1 text-muted">Status applies to the {s.statusScope} <span className="sci">{s.scientificName}</span>.{s.statusNote ? ` ${s.statusNote}` : ''}</dd></div>
                <div><dt className="text-[.62rem] uppercase tracking-[.2em] text-botanical">Assessment date and source</dt><dd className="mt-1 text-muted">Not recorded in this dataset, and the category has <strong className="font-medium text-ivory">not been re-checked</strong> against the live Red List by this project. <a className="link-u" href={iucnUrl} target="_blank" rel="noopener noreferrer">Check the IUCN Red List entry</a> for the current category and date.</dd></div>
                <div>
                  <dt className="text-[.62rem] uppercase tracking-[.2em] text-botanical">Population estimate</dt>
                  <dd className="mt-1 flex flex-wrap items-baseline gap-3"><span className="font-serif text-[1.6rem] font-light">Not available</span><span className="unverified-pill">No sourced figure</span></dd>
                  <dd className="mt-2 text-muted">{s.population.reason}</dd>
                </div>
              </dl>
            </div>
            <div data-fade>
              <h3 className="font-serif text-[1.5rem] font-light">Needs checking before publication</h3>
              <ul className="mt-4 space-y-3 text-[.9rem] text-muted">
                {s.audit.map((a, i) => (
                  <li key={i} className="relative pl-6 before:absolute before:left-0 before:top-[.8em] before:h-px before:w-3 before:bg-status-en">{a}</li>
                ))}
              </ul>
            </div>
          </div>
        </Wrap>
      </section>

      {/* 4. Habitat and distribution */}
      <section className="bg-forest py-28" id="habitat">
        <Wrap>
          <SectionHead label="Habitat & range" lines={['Where it ', { em: 'lives' }]}>
            The map shows a marker only, never the full range. Distribution polygons will be added once reliable range data is sourced.
          </SectionHead>
          <div className="grid gap-12 lg:grid-cols-[.7fr_1.3fr]">
            <div data-fade>
              <p className="text-muted"><strong className="font-medium text-ivory">Habitat. </strong>{s.habitat}.</p>
              <p className="mt-4 text-muted"><strong className="font-medium text-ivory">Region. </strong>{s.region}.</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {s.habitatTags.map((h) => <Link key={h} href={`/species?habitat=${h}`} className="chip">{HABITAT_LABELS[h]}</Link>)}
              </div>
            </div>
            <div data-fade><HabitatMap markers={markers} currentSlug={s.slug} height={400} /></div>
          </div>
        </Wrap>
      </section>

      {/* 5. Population history */}
      <section className="bg-forest-2 py-28" id="population">
        <Wrap>
          <SectionHead label="Population history" lines={['What the ', { em: 'figures' }, ' show']}>
            A chart appears only when a sourced, dated series with a stated unit exists. Otherwise this section says so instead.
          </SectionHead>
          <div className="max-w-[880px]" data-fade><PopulationChart species={s} /></div>
        </Wrap>
      </section>

      {/* 6. Threats */}
      <section className="bg-forest py-28" id="threats">
        <Wrap>
          <SectionHead label="Threats" lines={['What puts it ', { em: 'at risk' }]}>
            Listed in the project dataset. Tags link to the wider conservation story.
          </SectionHead>
          <ol className="grid gap-5 md:grid-cols-3" data-fade>
            {s.threats.map((th, i) => (
              <li key={i} className="rounded-2xl border border-white/10 p-7">
                <span className="font-serif text-[2.4rem] font-light italic text-lime">0{i + 1}</span>
                <p className="mt-3 text-[1rem]">{th}</p>
              </li>
            ))}
          </ol>
          <div className="mt-8 flex flex-wrap gap-2" data-fade>
            {s.threatTags.map((tg) => <Link key={tg} href={`/conservation#${tg}`} className="chip">{THREAT_LABELS[tg]}</Link>)}
          </div>
        </Wrap>
      </section>

      {/* 7. Conservation and recovery */}
      <section className="on-light rounded-t-[48px] bg-ivory py-28 text-forest" id="conservation">
        <Wrap>
          <SectionHead light label="Conservation & recovery" lines={['What is being ', { em: 'done' }]}>
            Four separate questions, answered separately: threats are not interventions, and interventions are not recovery.
          </SectionHead>
          <div className="grid gap-px overflow-hidden rounded-2xl border border-forest/15 bg-forest/15 md:grid-cols-2" data-fade>
            {[
              ['Current threats', s.threats.join(' · '), null],
              [s.conservation.reported ? 'Reported intervention' : 'Conservation actions', s.conservation.actions.join(' · '), s.conservation.reported ? 'Unverified' : 'Summarised'],
              ['Documented outcome', 'No sourced, dated outcome is recorded in this dataset yet.', null],
              ['Remaining challenges', `Still listed as ${s.status.label}. The threats above are ongoing.`, null],
            ].map(([k, v, flag]) => (
              <div key={k} className="bg-ivory p-7">
                <div className="flex items-center gap-3">
                  <h3 className="text-[.7rem] font-medium uppercase tracking-[.2em] text-forest-3">{k}</h3>
                  {flag && <span className="unverified-pill">{flag}</span>}
                </div>
                <p className="mt-3 text-[.95rem] text-[#3b4a40]">{v}</p>
              </div>
            ))}
          </div>
        </Wrap>
      </section>

      {/* 8. Listen */}
      <section className="bg-forest py-28" id="listen">
        <Wrap>
          <SectionHead label="Listen" lines={['A ', { em: 'demonstration' }, ' tone']} />
          <div className="max-w-[760px]" data-fade><AudioDemo species={s} /></div>
        </Wrap>
      </section>

      {/* 9. Related species */}
      <section className="bg-forest-2 py-28" id="related">
        <Wrap>
          <SectionHead label="Related species" lines={['Who is ', { em: 'kin' }, '?']}>
            Relationships come from classification and from shared tags in the data, and each one says why it is shown.
          </SectionHead>
          <RelatedSpecies species={s} relations={rel} />
        </Wrap>
      </section>

      {/* 10. Next species */}
      <section className="bg-forest py-24">
        <Wrap>
          <div className="grid gap-5 sm:grid-cols-2">
            {[['Previous', prev], ['Next', next]].map(([dir, sp]) => (
              <Link key={dir} href={`/species/${sp.slug}`} className="group card-lift rounded-2xl border border-white/10 p-8" data-fade>
                <span className="text-[.66rem] uppercase tracking-[.22em] text-botanical">{dir} species</span>
                <span className="mt-3 block font-serif text-[2rem] font-light">{sp.name}</span>
                <span className="sci block text-[.9rem] text-muted">{sp.scientificName}</span>
                <span className="mt-4 inline-block text-lime transition-transform duration-500 group-hover:translate-x-1" aria-hidden="true">{dir === 'Next' ? '→' : '←'}</span>
              </Link>
            ))}
          </div>
        </Wrap>
      </section>

      {/* 11. References */}
      <section className="border-t border-white/10 bg-ink py-16" id="references">
        <Wrap>
          <h2 className="text-[.7rem] font-medium uppercase tracking-[.22em] text-lime">References & method</h2>
          <ul className="mt-5 grid gap-3 text-[.88rem] text-muted md:grid-cols-2">
            {s.sources.map((src) => {
              const href = safeExternalUrl(src.url);
              return (
                <li key={src.url}>
                  {href ? <a className="link-u" href={href} target="_blank" rel="noopener noreferrer">{src.label}</a> : <span>{src.label}</span>}
                  <span className="block text-[.78rem] text-botanical">Supports: {src.supports}. {src.checked ? 'Link checked.' : 'Link not opened or checked when this version was built.'}</span>
                </li>
              );
            })}
            <li>Map tiles: OpenStreetMap contributors, CARTO, Esri and OpenTopoMap, as credited on the map.</li>
            <li>Threats, conservation actions and the summary are written for this atlas and are not individually cited. See <Link className="link-u" href="/about#methodology">Methodology</Link> and the limits below.</li>
          </ul>
          <h3 className="mt-8 text-[.7rem] font-medium uppercase tracking-[.22em] text-botanical">Data limitations for this species</h3>
          <ul className="mt-3 space-y-2 text-[.84rem] text-muted">
            {s.audit.map((a, i) => <li key={i}>• {a}</li>)}
          </ul>
          <p className="mt-6 text-[.78rem] text-botanical">{all.length} species in the atlas.</p>
        </Wrap>
      </section>
    </>
  );
}
