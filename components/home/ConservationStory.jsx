import Link from 'next/link';
import Headline from '../ui/Headline';
import SpeciesImage from '../ui/SpeciesImage';

/** Careful case study: keeps threat, intervention, outcome and remaining risk apart. */
export default function ConservationStory({ species, card }) {
  const rows = [
    ['Threat', species.threats.join('; ') + '.'],
    ['Intervention', species.conservationWin, true],
    ['Outcome', 'No sourced, dated outcome is recorded in this dataset yet. A documented result will be added here with its source.'],
    ['Remaining', `The species is still listed as ${species.status.label}. Progress is not the same as recovery.`],
  ];
  return (
    <section className="on-light rounded-t-[48px] bg-ivory py-32 text-forest" id="story">
      <div className="mx-auto grid w-[min(1320px,100%-36px)] gap-16 sm:w-[min(1320px,100%-56px)] lg:grid-cols-[1.05fr_.95fr]">
        <div data-mask className="relative min-h-[520px] overflow-hidden rounded-[200px_200px_18px_18px] lg:min-h-[680px]">
          <SpeciesImage species={card} />
          <span className="absolute inset-x-0 bottom-5 z-10 text-center text-[.62rem] uppercase tracking-[.2em] text-white/75">{species.name} · <span className="sci">{species.scientificName}</span></span>
        </div>
        <div className="flex flex-col justify-center gap-6">
          <span className="label" data-fade>Conservation story</span>
          <Headline className="text-[clamp(2.2rem,4.2vw,3.8rem)]" lines={['The condor, still', ['on the ', { em: 'edge' }]]} />
          <p className="text-[#3b4a40]" data-fade>
            The California condor is North America&apos;s largest land bird. Captive breeding and release is widely credited with pulling it back from the brink, yet it remains Critically Endangered and depends on continuing human support.
          </p>
          <dl className="mt-2" data-fade>
            {rows.map(([k, v, flag]) => (
              <div key={k} className="grid gap-1 border-t border-forest/15 py-4 last:border-b sm:grid-cols-[116px_1fr] sm:gap-4">
                <dt className="pt-1 text-[.66rem] font-medium uppercase tracking-[.18em] text-forest-3">{k}</dt>
                <dd className="text-[.92rem] text-[#3b4a40]">{v} {flag && <span className="unverified-pill ml-1 align-middle">Unverified</span>}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap gap-4" data-fade>
            <Link href={`/species/${species.slug}`} className="btn btn-dark">Open the condor profile <span className="arr" aria-hidden="true">→</span></Link>
            <Link href="/conservation" className="btn btn-dark">More conservation stories <span className="arr" aria-hidden="true">→</span></Link>
          </div>
        </div>
      </div>
    </section>
  );
}
