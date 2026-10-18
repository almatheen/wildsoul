import { Suspense } from 'react';
import PageIntro from '../../components/layout/PageIntro';
import Expedition from '../../components/expedition/Expedition';
import { getAllSpecies, getAllCards } from '../../lib/species';
import { factsFor } from '../../lib/quiz/facts.mjs';

export const metadata = {
  title: 'Wildlife expedition',
  description: 'An optional guided trail through every species in the atlas, plus a six-level wildlife quiz.',
};

export default function ExplorePage() {
  const stops = getAllSpecies();
  const cards = getAllCards();
  return (
    <>
      <PageIntro label="Wildlife expedition" lines={['Travel the world,', ['one ', { em: 'habitat' }, ' at a time']]}>
        An optional trail through all {stops.length} species. Open any stop, in any order, to see its habitat, population information and a demonstration tone. When you feel like it, try the six-level challenge. Nothing on the trail is locked.
      </PageIntro>
      <section className="bg-forest pb-32 pt-4">
        <div className="mx-auto w-[min(1320px,100%-36px)] sm:w-[min(1320px,100%-56px)]">
          <Suspense fallback={<p className="py-20 text-center text-muted">Loading the trail…</p>}>
            <Expedition stops={stops} cards={cards} facts={factsFor(stops)} />
          </Suspense>
        </div>
      </section>
    </>
  );
}
