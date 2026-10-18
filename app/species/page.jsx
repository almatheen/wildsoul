import { Suspense } from 'react';
import PageIntro from '../../components/layout/PageIntro';
import SpeciesAtlas from '../../components/species/SpeciesAtlas';
import { getAllCards } from '../../lib/species';

export const metadata = {
  title: 'Species atlas',
  description: 'Search and filter threatened species by name, conservation status, animal group and habitat.',
};

export default function SpeciesPage() {
  const cards = getAllCards();
  return (
    <>
      <PageIntro label="Species atlas" lines={['Find a species,', ['follow its ', { em: 'family' }]]}>
        Search by common or scientific name, then narrow by conservation status, animal group or habitat. Every profile links to its relatives.
      </PageIntro>
      <section className="bg-forest pb-32 pt-6">
        <div className="mx-auto w-[min(1320px,100%-36px)] sm:w-[min(1320px,100%-56px)]">
          <Suspense fallback={<p className="py-20 text-center text-muted">Loading species…</p>}>
            <SpeciesAtlas cards={cards} />
          </Suspense>
        </div>
      </section>
    </>
  );
}
