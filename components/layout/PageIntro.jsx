import Headline from '../ui/Headline';

/** Dark editorial page opener used by inner routes. */
export default function PageIntro({ label, lines, children, className = '' }) {
  return (
    <section className={`relative overflow-hidden bg-forest px-0 pb-16 pt-[168px] ${className}`}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_80%_20%,rgba(113,134,108,.35),transparent_70%)]" />
      <div className="relative mx-auto w-[min(1320px,100%-36px)] sm:w-[min(1320px,100%-56px)]">
        <span className="label" data-fade>{label}</span>
        <Headline as="h1" lines={lines} className="mt-5 text-[clamp(2.8rem,7.4vw,7rem)]" />
        {children && <div className="mt-8 max-w-[560px] text-[1.05rem] text-muted" data-fade>{children}</div>}
      </div>
    </section>
  );
}
