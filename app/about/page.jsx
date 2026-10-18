import Link from 'next/link';
import PageIntro from '../../components/layout/PageIntro';
import { getAllSpecies } from '../../lib/species';

export const metadata = {
  title: 'About and methodology',
  description: 'The WildSoul mission, how its data is assembled, what is verified, and what is not yet.',
};

const H = ({ id, children }) => <h2 id={id} className="mb-5 scroll-mt-28 font-serif text-[clamp(1.8rem,3.4vw,2.6rem)] font-light" data-fade>{children}</h2>;

export default function AboutPage() {
  const all = getAllSpecies();
  const flagged = all.reduce((n, s) => n + s.audit.length, 0);
  return (
    <>
      <PageIntro label="About" lines={['An atlas built on', ['honest ', { em: 'limits' }]]}>
        WildSoul is an educational project about threatened species. It would rather show you a gap than fill it with something that only looks authoritative.
      </PageIntro>

      <section className="bg-forest pb-28 pt-6">
        <div className="mx-auto grid w-[min(1320px,100%-36px)] gap-16 sm:w-[min(1320px,100%-56px)] lg:grid-cols-[.7fr_1.3fr]">
          <nav aria-label="On this page" className="hidden lg:block">
            <ul className="sticky top-28 space-y-3 text-[.9rem] text-muted">
              {[['mission', 'Mission'], ['methodology', 'Methodology'], ['sources', 'Sources'], ['limits', 'Known limits'], ['update', 'Updating the data']].map(([id, l]) => (
                <li key={id}><a className="hover:text-lime" href={`#${id}`}>{l}</a></li>
              ))}
            </ul>
          </nav>

          <div className="max-w-[720px] space-y-20 text-muted">
            <div id="mission" className="scroll-mt-28">
              <H>Mission</H>
              <p data-fade>To help people discover threatened animals, see how they are related to one another, understand what endangers them, and learn what is being done. It is informational, not a game: every stop on the optional expedition is open, and no quiz is needed to read anything.</p>
            </div>

            <div>
              <H id="methodology">Methodology</H>
              <div className="space-y-4" data-fade>
                <p>Every page is generated from one shared dataset of {all.length} species. Cards, filters, profiles, maps, charts and related-species links all read from it, so they cannot disagree.</p>
                <p><b className="font-medium text-ivory">Taxonomy.</b> Class, order, family and genus are recorded for each species. Relationships between species are <i>derived</i> from those ranks (same genus, same family, same order), not typed in by hand.</p>
                <p><b className="font-medium text-ivory">Habitat and threat links.</b> Each species carries habitat and threat tags. A “shares habitat” or “shares threat” link means the tags overlap. It does not mean the animals meet, and it is labelled that way.</p>
                <p><b className="font-medium text-ivory">Original figures.</b> Population numbers and narratives for the original species came with the project dataset and have no sources or dates attached. They are not charted. They sit in a collapsed, clearly labelled table so nothing is silently removed.</p>
                <p><b className="font-medium text-ivory">Added species.</b> Thirty-five species were added to reach eight in each of six groups. Their summaries, threats and conservation actions were written for this atlas from general knowledge, and population estimates were deliberately left out. Each profile lists search and reading links for checking.</p>
                <p><b className="font-medium text-ivory">The 48-species catalogue.</b> The original data held ten mammals but the catalogue allows eight per group, so two (Bengal tiger and Sumatran orangutan) were archived rather than deleted. Their records are still in the source data.</p>
              </div>
            </div>

            <div>
              <H id="sources">Sources</H>
              <ul className="space-y-3" data-fade>
                <li><b className="font-medium text-ivory">Conservation status:</b> categories follow the <a className="link-u" href="https://www.iucnredlist.org/" target="_blank" rel="noopener noreferrer">IUCN Red List</a>. Each profile links to a search for that species so you can confirm the current category and assessment date.</li>
                <li><b className="font-medium text-ivory">Photographs:</b> until verified images are stored (see below) the site tries each species&apos; Wikipedia lead image live. Those are <b className="font-medium text-ivory">unverified</b>: the author and licence are on the Wikipedia article. When a reviewed record with author and licence exists in the image manifest it is used and credited instead.</li>
                <li><b className="font-medium text-ivory">Maps:</b> tiles from CARTO and OpenStreetMap contributors, Esri, and OpenTopoMap, credited on the map itself.</li>
              </ul>
            </div>

            <div>
              <H id="limits">Known limits</H>
              <ul className="space-y-3" data-fade>
                <li>{flagged} specific data concerns across {all.length} species are listed in each profile under “Needs checking before publication”.</li>
                <li>Maps show a marker, never a range. Several markers are approximate regional points, and two species are wide-ranging; the map says so each time.</li>
                <li>No population chart is drawn for any species. A chart needs a dated, sourced series with a stated unit and method, and none has been added yet.</li>
                <li>Conservation categories were written down from general knowledge and have not been re-checked against the live IUCN Red List. Check each category and its assessment date before citing it.</li>
                <li>Audio is synthesized by your browser as a demonstration. It is not a recording of any animal.</li>
              </ul>
            </div>

            <div>
              <H id="update">Updating the data</H>
              <div className="space-y-4" data-fade>
                <p>Edit <code className="rounded bg-white/10 px-1.5 py-0.5 text-[.85em]">data/species-additions.json</code> (or the dataset and enrichment files for the original species), then run <code className="rounded bg-white/10 px-1.5 py-0.5 text-[.85em]">npm run check:data</code>. To store verified photographs with author and licence, run <code className="rounded bg-white/10 px-1.5 py-0.5 text-[.85em]">npm run images:fetch</code> on a machine with internet access and review the result. New species appear everywhere automatically.</p>
                <Link href="/species" className="btn btn-fill">Browse the atlas <span className="arr" aria-hidden="true">→</span></Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
