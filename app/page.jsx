import Hero from '../components/home/Hero';
import Marquee from '../components/home/Marquee';
import Glance from '../components/home/Glance';
import FeaturedShowcase from '../components/home/FeaturedShowcase';
import AtlasTeaser from '../components/home/AtlasTeaser';
import ConservationStory from '../components/home/ConservationStory';
import ExpeditionPreview from '../components/home/ExpeditionPreview';
import GroupTiles from '../components/home/GroupTiles';
import WildlifeNetwork from '../components/science/WildlifeNetwork';
import Headline from '../components/ui/Headline';
import Link from 'next/link';
import { getAllSpecies, getAllCards, getSpecies, getGroups, getFeatured, getNetworkSet, toCard } from '../lib/species';

export default function Home() {
  const all = getAllSpecies();
  const cards = getAllCards();
  const bySlug = Object.fromEntries(cards.map((c) => [c.slug, c]));
  const counts = { CR: 0, EN: 0, VU: 0 };
  all.forEach((s) => { counts[s.status.code] += 1; });
  const groups = getGroups();

  return (
    <>
      <Hero feature={bySlug['amur-leopard']} />
      <Marquee items={cards} />
      <Glance counts={counts} total={all.length} groups={groups.filter((g) => g.members.length).length} />
      <FeaturedShowcase items={getFeatured().map(toCard)} />

      <section className="bg-forest-2 py-32" id="connection">
        <div className="mx-auto grid w-[min(1320px,100%-36px)] items-start gap-14 sm:w-[min(1320px,100%-56px)] lg:grid-cols-[.7fr_1.3fr]">
          <div>
            <span className="label" data-fade>The biodiversity connection</span>
            <Headline className="mt-5 text-[clamp(2.4rem,5vw,4.4rem)]" lines={['Every species', ['has ', { em: 'kin.' }]]} />
            <p className="mt-7 max-w-[420px] text-muted" data-fade>
              Animals sit inside shared branches of the tree of life, share habitats and face common threats. This curated selection shows who is connected; hover or tab through it, then step into any profile.
            </p>
            <Link href="/groups" className="btn mt-8" data-fade>Explore all relationships <span className="arr" aria-hidden="true">→</span></Link>
          </div>
          <div data-fade><WildlifeNetwork species={cards} curated={getNetworkSet().map(toCard)} initialMode="taxonomy" controls={false} compact /></div>
        </div>
      </section>

      <AtlasTeaser total={all.length} counts={counts} />
      <ConservationStory species={getSpecies('california-condor')} card={bySlug['california-condor']} />

      <section className="on-light bg-ivory pb-32 text-forest" id="groups">
        <div className="mx-auto w-[min(1320px,100%-36px)] sm:w-[min(1320px,100%-56px)]">
          <div className="mb-12">
            <span className="label" data-fade>Explore by group</span>
            <Headline className="mt-5 text-[clamp(2.4rem,5vw,4.4rem)]" lines={['Six branches of', ['the living ', { em: 'tree' }]]} />
          </div>
          <GroupTiles groups={groups} />
        </div>
      </section>

      <ExpeditionPreview stops={getFeatured().slice(0, 5).map(toCard)} />

      <section className="overflow-hidden bg-[radial-gradient(55%_70%_at_50%_100%,rgba(113,134,108,.4),transparent_70%)] bg-forest py-40 text-center">
        <div className="mx-auto w-[min(1320px,100%-36px)] sm:w-[min(1320px,100%-56px)]">
          <span className="label" data-fade>About WildSoul</span>
          <Headline className="my-7 text-[clamp(3.2rem,10vw,10rem)]" lines={['Learn the names.', ['Protect the ', { em: 'wild.' }]]} />
          <Link href="/species" className="btn btn-fill" data-fade>Enter the atlas <span className="arr" aria-hidden="true">→</span></Link>
        </div>
      </section>
    </>
  );
}
