
import Link from 'next/link';
import Headline from '../ui/Headline';
import SpeciesImage from '../ui/SpeciesImage';
import StatusBadge from '../ui/StatusBadge';

export default function Hero({ feature }) {
  return (
    <section
      data-hero
      className="relative flex h-[100svh] min-h-[680px] items-end overflow-hidden pb-16"
    >
      {/* Hero background image */}
      <div
        data-hero-media
        className="absolute inset-0 -z-20 [&_.ph]:h-full [&_.ph]:w-full [&_img]:h-full [&_img]:w-full [&_img]:object-cover [&_img]:object-[45%_center] md:[&_img]:object-center"
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
        className="mx-auto grid w-[min(1320px,100%-36px)] items-end gap-10 sm:w-[min(1320px,100%-56px)] lg:grid-cols-[1fr_auto]"
        data-hero-inner
      >
        <div>
          <div className="hero-rule mb-7 h-px w-[140px] bg-lime" />

          <span className="label" data-hero-fade>
            Endangered species atlas
          </span>

          <Headline
            as="h1"
            hero
            className="mt-6 text-[clamp(3.3rem,9.4vw,9.4rem)]"
            lines={['The wild is', ['worth ', { em: 'protecting.' }]]}
          />

          <p
            className="mb-9 mt-8 max-w-[470px] text-[1.06rem] text-ivory/80"
            data-hero-fade
          >
            Discover threatened species, understand the ecosystems they depend
            on, and follow the families and conservation stories that connect
            them.
          </p>

          <div
            className="flex flex-wrap items-center gap-7"
            data-hero-fade
          >
            <Link
              href="/species"
              className="btn btn-fill btn-sweep"
            >
              Explore Species
              <span className="arr" aria-hidden="true">
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
      <p className="absolute bottom-3.5 left-7 text-[.58rem] uppercase tracking-[.14em] text-white/40">
        Photograph: Wikipedia lead image when available · see article for
        author and licence
      </p>
    </section>
  );
}
