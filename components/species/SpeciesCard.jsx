import Link from 'next/link';
import SpeciesImage from '../ui/SpeciesImage';
import StatusBadge from '../ui/StatusBadge';

/** Whole card is one link: keyboard and screen-reader friendly. */
export default function SpeciesCard({ s, ratio = 'aspect-[4/4.6]', className = '' }) {
  return (
    <Link
      href={`/species/${s.slug}`}
      className={`group card-lift relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-forest-2 ${className}`}
    >
      <div className={`relative ${ratio} overflow-hidden shade-b`}>
        <SpeciesImage species={s} zoomOnHover />
        <StatusBadge code={s.statusCode} label={s.statusLabel} className="absolute left-4 top-4 z-10" />
        <span
          aria-hidden="true"
          className="absolute right-3.5 top-3.5 z-10 grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-forest/50 transition-all duration-500 group-hover:rotate-45 group-hover:bg-lime group-hover:text-forest"
        >
          ↗
        </span>
      </div>
      <div className="flex flex-1 flex-col px-6 pb-6 pt-5">
        <h3 className="font-serif text-[1.85rem] font-light leading-[1.05]">{s.name}</h3>
        <p className="sci mb-3 mt-1.5 text-[.88rem] text-muted">{s.scientificName}</p>
        <p className="line-clamp-3 text-[.88rem] text-muted">{s.tagline}</p>
        <div className="mt-auto flex flex-wrap gap-2 pt-4">
          <span className="rounded-full border border-white/10 px-2.5 py-1 text-[.62rem] uppercase tracking-[.14em] text-botanical">{s.family}</span>
          <span className="rounded-full border border-white/10 px-2.5 py-1 text-[.62rem] uppercase tracking-[.14em] text-botanical">{s.group}</span>
        </div>
      </div>
    </Link>
  );
}
