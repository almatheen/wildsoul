import Link from 'next/link';
import Headline from '../ui/Headline';
import { STATUS } from '../../lib/species';

export default function AtlasTeaser({ total, counts }) {
  return (
    <section className="bg-forest-2 py-32">
      <div className="mx-auto w-[min(1320px,100%-36px)] sm:w-[min(1320px,100%-56px)]">
        <div className="flex flex-wrap items-end justify-between gap-10">
          <div>
            <span className="label" data-fade>The atlas</span>
            <Headline className="mt-5 text-[clamp(2.6rem,6vw,5.6rem)]" lines={[`${total} species.`, ['One ', { em: 'searchable' }, ' atlas.']]} />
          </div>
          <div className="max-w-[380px]">
            <p className="mb-6 text-muted" data-fade>Search by name, then filter by status, animal group or habitat. Each profile shows where the animal lives and who its relatives are.</p>
            <Link href="/species" className="btn btn-fill" data-fade>Browse the atlas <span className="arr" aria-hidden="true">→</span></Link>
          </div>
        </div>
        <ul className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-3" data-fade>
          {['CR', 'EN', 'VU'].map((c) => (
            <li key={c} className="contents">
              <Link href={`/species?status=${c}`} className="group flex items-center justify-between gap-4 bg-forest-2 p-7 transition-colors hover:bg-forest-3">
                <span>
                  <span className={`badge badge-${c} mb-3`}><i aria-hidden="true" /> {c}</span>
                  <span className="block font-serif text-[1.6rem] font-light">{STATUS[c].label}</span>
                  <span className="text-[.82rem] text-muted">{counts[c]} {counts[c] === 1 ? 'species' : 'species'}</span>
                </span>
                <span aria-hidden="true" className="text-lime transition-transform duration-500 group-hover:translate-x-1">→</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
