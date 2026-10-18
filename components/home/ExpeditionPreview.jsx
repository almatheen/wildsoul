import Link from 'next/link';
import Headline from '../ui/Headline';
import SpeciesImage from '../ui/SpeciesImage';

/** Teaser for the optional Wildlife Expedition. Nothing in it is locked. */
export default function ExpeditionPreview({ stops }) {
  const offsets = ['lg:mt-0', 'lg:mt-16', 'lg:mt-0', 'lg:mt-16', 'lg:mt-0'];
  return (
    <section className="bg-forest py-32">
      <div className="mx-auto w-[min(1320px,100%-36px)] sm:w-[min(1320px,100%-56px)]">
        <div className="grid items-end gap-10 lg:grid-cols-[1fr_auto]">
          <div>
            <span className="label" data-fade>Wildlife expedition</span>
            <Headline className="mt-5 text-[clamp(2.4rem,5.4vw,5rem)]" lines={['Travel the world,', ['one ', { em: 'habitat' }, ' at a time']]} />
            <p className="mt-6 max-w-[560px] text-muted" data-fade>
              A guided trail through every species in the atlas, plus an optional six-level quiz of thirty questions. Nothing is locked on the trail: open any stop, in any order. Quiz levels unlock one after another, and your progress is saved on this device only.
            </p>
          </div>
          <Link href="/explore" className="btn btn-fill justify-self-start lg:justify-self-end" data-fade>Start the expedition <span className="arr" aria-hidden="true">→</span></Link>
        </div>
        <ol className="mt-16 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5" data-fade>
          {stops.map((s, i) => (
            <li key={s.slug} className={offsets[i % offsets.length]}>
              <Link href={`/explore?stop=${s.slug}`} className="group flex flex-col items-center text-center">
                <span className="relative block h-28 w-28 overflow-hidden rounded-full border-2 border-white/20 transition-all duration-500 group-hover:scale-105 group-hover:border-lime">
                  <SpeciesImage species={s} />
                </span>
                <span className="mt-3 text-[.62rem] uppercase tracking-[.2em] text-botanical">Stop {s.level}</span>
                <span className="font-serif text-[1.15rem] font-light">{s.name}</span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
