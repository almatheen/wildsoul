import Link from 'next/link';
import PageIntro from '../../components/layout/PageIntro';
import Headline from '../../components/ui/Headline';
import WildlifeNetwork from '../../components/science/WildlifeNetwork';
import SpeciesCard from '../../components/species/SpeciesCard';
import { GROUP_ICONS } from '../../components/home/GroupTiles';
import { getAllCards, getGroups, getNetworkSet, toCard } from '../../lib/species';

export const metadata = {
  title: 'Groups & relationships',
  description: 'Browse animals by group and see how species are related by family, habitat and shared threats.',
};

/** group > order > family > species, derived from the data. */
function tree(members) {
  const orders = {};
  members.forEach((s) => {
    const o = (orders[s.taxonomy.order] ||= {});
    (o[s.taxonomy.family] ||= []).push(s);
  });
  return orders;
}

export default function GroupsPage() {
  const cards = getAllCards();
  const bySlug = Object.fromEntries(cards.map((c) => [c.slug, c]));
  const groups = getGroups();

  return (
    <>
      <PageIntro label="Groups & relationships" lines={['Branches of the', ['living ', { em: 'tree' }]]}>
        Species are related in different ways: by ancestry, by the places they live and by the pressures they face. Switch the network between them, then browse each group below.
      </PageIntro>

      <section className="bg-forest pb-28 pt-6" id="network">
        <div className="mx-auto w-[min(1320px,100%-36px)] sm:w-[min(1320px,100%-56px)]">
          <WildlifeNetwork species={cards} curated={getNetworkSet().map(toCard)} initialMode="taxonomy" scopes />
        </div>
      </section>

      {groups.map((g, gi) => {
        const light = gi % 2 === 0;
        const orders = tree(g.members);
        return (
          <section key={g.slug} id={g.slug} className={`${light ? 'on-light bg-ivory text-forest' : 'bg-forest-2'} py-24`}>
            <div className="mx-auto w-[min(1320px,100%-36px)] sm:w-[min(1320px,100%-56px)]">
              <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr]">
                <div>
                  <svg viewBox="0 0 64 64" className="mb-6 h-14 w-14 fill-none stroke-current" strokeWidth="1" aria-hidden="true">{GROUP_ICONS[g.slug]}</svg>
                  <span className="label" data-fade>{g.class ? `Class ${g.class}` : 'Group'}</span>
                  <Headline className="mt-4 text-[clamp(2.4rem,5vw,4.2rem)]" lines={[g.name]} />
                  <p className={`mt-5 max-w-[440px] ${light ? 'text-[#3b4a40]' : 'text-muted'}`} data-fade>{g.blurb}</p>
                  <p className={`mt-4 text-[.82rem] ${light ? 'text-[#5c6b61]' : 'text-botanical'}`}>{g.members.length} {g.members.length === 1 ? 'species' : 'species'} in this atlas</p>
                  {g.members.length > 0 && <Link href={`/species?group=${encodeURIComponent(g.name)}`} className="link-u mt-3 inline-block">View {g.name.toLowerCase()} in the atlas →</Link>}
                  {g.traits.length > 0 && (
                    <ul className={`mt-6 space-y-1.5 text-[.9rem] ${light ? 'text-[#3b4a40]' : 'text-muted'}`} data-fade>
                      {g.traits.map((t) => <li key={t} className="flex items-center gap-3"><span aria-hidden="true" className="h-px w-4 bg-current" />{t}</li>)}
                    </ul>
                  )}
                </div>

                <div>
                  {g.members.length ? (
                    <>
                      <h3 className={`mb-4 text-[.7rem] font-medium uppercase tracking-[.2em] ${light ? 'text-forest-3' : 'text-lime'}`}>Classification of species in the atlas</h3>
                      <ul className={`mb-8 divide-y ${light ? 'divide-forest/15' : 'divide-white/10'} border-y ${light ? 'border-forest/15' : 'border-white/10'}`}>
                        {Object.entries(orders).map(([order, fams]) => (
                          <li key={order} className="py-4">
                            <p className="font-serif text-[1.3rem] font-light"><span className={`mr-2 text-[.6rem] uppercase tracking-[.2em] ${light ? 'text-[#6b7b70]' : 'text-botanical'}`}>Order</span>{order}</p>
                            <ul className="mt-2 space-y-2 pl-4">
                              {Object.entries(fams).map(([fam, sp]) => (
                                <li key={fam} className="text-[.9rem]">
                                  <span className={`mr-2 text-[.58rem] uppercase tracking-[.2em] ${light ? 'text-[#6b7b70]' : 'text-botanical'}`}>Family</span>{fam}
                                  <span className={light ? 'text-[#3b4a40]' : 'text-muted'}>: {sp.map((s, i) => (
                                    <span key={s.slug}>{i > 0 && ', '}<Link className="underline decoration-current/30 underline-offset-4 hover:text-lime" href={`/species/${s.slug}`}>{s.name}</Link></span>
                                  ))}</span>
                                </li>
                              ))}
                            </ul>
                          </li>
                        ))}
                      </ul>
                      <ul className="grid gap-5 sm:grid-cols-2">
                        {g.members.map((s) => <li key={s.slug}><SpeciesCard s={bySlug[s.slug]} ratio="aspect-[4/3.4]" className={light ? '' : ''} /></li>)}
                      </ul>
                    </>
                  ) : (
                    <p className={`note-box ${light ? '' : ''}`}>No species from this group are in the atlas yet. The data model already supports them: add a record and it will appear here automatically.</p>
                  )}
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </>
  );
}
