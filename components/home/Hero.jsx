
import Link from 'next/link';
import Headline from '../ui/Headline';
import SpeciesImage from '../ui/SpeciesImage';
import StatusBadge from '../ui/StatusBadge';

export default function Hero({ feature }) {
  return (
    <section
      data-hero
      className="relative flex min-h-[720px] h-[100svh] items-end overflow-hidden pb-12 sm:pb-16"
    >
      {/* Hero background image */}
      <div
        data-hero-media
        
        className="absolute inset-0 -z-20 [&_.ph]:h-full [&_.ph]:w-full [&_img]:h-full [&_img]:w-full [&_img]:object-cover [&_img]:object-[15%_center] md:[&_img]:object-center"

      >
        <SpeciesImage species={feature} priority />
      </div>

      {/* Gradient overlay */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(7,13,10,.68),rgba(7,13,10,.05)_30%,rgba(7,13,10,.55)_70%,#0B1511),linear-gradient(90deg,rgba(7,13,10,.78),transparent_65%)]"
      />

      {/* Hero content */}
      <div
        className="mx-auto grid w-[min(1320px,100%-32px)] items-end gap-6 sm:w-[min(1320px,100%-56px)] sm:gap-10 lg:grid-cols-[1fr_auto]"
        data-hero-inner
      >
        <div>
          <div className="hero-rule mb-5 h-px w-[100px] bg-lime sm:mb-7 sm:w-[140px]" />

          <span className="label" data-hero-fade>
            Endangered species atlas
          </span>

          <Headline
            as="h1"
            hero
            className="mt-4 text-[clamp(2.8rem,9.4vw,9.4rem)] sm:mt-6 sm:text-[clamp(3.3rem,9.4vw,9.4rem)]"
            lines={['The wild is', ['worth ', { em: 'protecting.' }]]}
          />

          <p
            className="mb-6 mt-5 max-w-[470px] text-[.95rem] leading-relaxed text-ivory/85 sm:mb-9 sm:mt-8 sm:text-[1.06rem]"
            data-hero-fade
          >
            Discover threatened species, understand the ecosystems they depend
            on, and follow the families and conservation stories that connect
            them.
          </p>

          <div
            className="flex flex-wrap items-center gap-4 sm:gap-7"
            data-hero-fade
          >
            <Link
              href="/species"
              className="btn btn-fill btn-sweep !gap-2"
            >
              <span>Explore Species</span>
              <span
                className="arr !ml-0 !mr-0"
                aria-hidden="true"
              >
                →
              </span>
            </Link>

            <Link href="/about" className="link-u">
              Learn about the mission
            </Link>
          </div>
        </div>

        {/* Featured species card — desktop only */}
        <Link
          href={`/species/${feature.slug}`}
          data-hero-fade
          className="card-lift hidden w-[300px] rounded-2xl border border-white/12 bg-forest/55 p-5 backdrop-blur-md lg:block"
          aria-label={`Featured species: ${feature.name}. Open profile.`}
        >
          <small className="block text-[.62rem] uppercase tracking-[.22em] text-muted">
            Featured species
          </small>

          <b className="mt-2 block font-serif text-[1.7rem] font-light leading-[1.1]">
            {feature.name}
          </b>

          <i className="text-[.85rem] text-muted">
            {feature.scientificName}
          </i>

          <div className="mt-4 flex items-center justify-between">
            <StatusBadge
              code={feature.statusCode}
              label={feature.statusLabel}
            />
            <span aria-hidden="true">↗</span>
          </div>
        </Link>
      </div>

      {/* Desktop scroll indicator */}
      <div
        aria-hidden="true"
        className="absolute bottom-8 right-7 hidden items-center gap-3 text-[.62rem] uppercase tracking-[.26em] text-muted [writing-mode:vertical-rl] xl:flex"
      >
        Scroll
        <span className="cue-line" />
      </div>

      {/* Photograph attribution */}
      <p className="absolute bottom-3.5 left-4 right-4 text-[.48rem] leading-relaxed uppercase tracking-[.1em] text-white/45 sm:bottom-3.5 sm:left-7 sm:right-auto sm:text-[.58rem] sm:tracking-[.14em]">
        Photograph: Wikipedia lead image when available · see article for
        author and licence
      </p>
    </section>
  );
}
