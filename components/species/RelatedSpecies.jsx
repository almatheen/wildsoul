import Link from 'next/link';
import SpeciesImage from '../ui/SpeciesImage';
import StatusBadge from '../ui/StatusBadge';
import { toCard } from '../../lib/species';

function RelCard({ rel }) {
  const c = toCard(rel.species);
  return (
    <li>
      <Link href={`/species/${c.slug}`} className="group card-lift flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-forest-2">
        <div className="relative aspect-[4/3] overflow-hidden shade-b">
          <SpeciesImage species={c} zoomOnHover />
          <span className="absolute left-3.5 top-3.5 z-10 rounded-full bg-lime px-3 py-1 text-[.62rem] font-medium uppercase tracking-[.14em] text-forest">{rel.label}</span>
        </div>
        <div className="flex flex-1 flex-col p-5">
          <h4 className="font-serif text-[1.4rem] font-light leading-tight">{c.name}</h4>
          <p className="sci text-[.82rem] text-muted">{c.scientificName}</p>
          <p className="mt-3 text-[.85rem] text-muted">{rel.reason}</p>
          <div className="mt-auto pt-4"><StatusBadge code={c.statusCode} label={c.statusLabel} /></div>
        </div>
      </Link>
    </li>
  );
}

function Block({ title, intro, items, empty }) {
  return (
    <div className="mt-12 first:mt-0">
      <h3 className="font-serif text-[1.7rem] font-light">{title}</h3>
      <p className="mb-5 mt-1 max-w-[620px] text-[.88rem] text-muted">{intro}</p>
      {items.length ? (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" data-fade>
          {items.map((r) => <RelCard key={`${r.type}-${r.species.slug}`} rel={r} />)}
        </ul>
      ) : (
        <p className="note-box">{empty}</p>
      )}
    </div>
  );
}

export default function RelatedSpecies({ species, relations }) {
  const { taxonomic, habitat, threat, curated = [], broaderGroup } = relations;
  const everyRelation = [...taxonomic, ...habitat, ...threat];
  const closest = curated.map((sp) => {
    const found = everyRelation.find((x) => x.species.slug === sp.slug);
    return found ? { ...found, type: 'closest', label: 'Closest match' } : { species: sp, type: 'closest', label: 'Related', reason: `Related within the ${sp.group.toLowerCase()} group.` };
  });
  const t = species.taxonomy;
  return (
    <div>
      <Block
        title="Closest matches"
        intro="The three species in the atlas that share the most with this one, weighing classification first, then habitat and threats."
        items={closest}
        empty="No close matches in the atlas."
      />
      <Block
        title="Scientific relatives"
        intro={`Closest relatives in this atlas, ranked by shared classification: same genus (${t.genus}), then same family (${t.family}), then same order (${t.order}).`}
        items={taxonomic.slice(0, 6)}
        empty={`No other ${t.family} or ${t.order} species are in the atlas yet. The ${species.group.toLowerCase()} group page lists the nearest kin.`}
      />
      <Block
        title="Shares a habitat type"
        intro="Not necessarily the same place, but the same kind of environment."
        items={habitat.slice(0, 3)}
        empty="No other catalogued species shares this habitat type."
      />
      <Block
        title="Faces similar threats"
        intro="Species affected by the same pressures in the project dataset. Solutions for one often help the others."
        items={threat.slice(0, 3)}
        empty="No other catalogued species shares these threats."
      />
      <div className="mt-12 flex flex-wrap gap-4">
        {broaderGroup && <Link href={`/groups#${broaderGroup.slug}`} className="btn">Explore all {broaderGroup.name.toLowerCase()} <span className="arr" aria-hidden="true">→</span></Link>}
        <Link href={`/species?group=${encodeURIComponent(species.group)}`} className="btn">Browse the {species.group.toLowerCase()} in the atlas <span className="arr" aria-hidden="true">→</span></Link>
      </div>
    </div>
  );
}
