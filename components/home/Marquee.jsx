export default function Marquee({ items }) {
  const row = items.map((s) => (
    <span key={s.slug} className="inline-flex items-center gap-14">
      <i className="font-serif text-2xl font-light text-muted">{s.name}</i>
      <b className="rounded-full border border-lime/35 px-2.5 py-0.5 font-sans text-[.66rem] font-normal tracking-[.2em] not-italic text-lime">{s.statusCode}</b>
    </span>
  ));
  return (
    <div className="overflow-hidden whitespace-nowrap border-y border-white/10 bg-forest py-6" aria-hidden="true">
      <div className="marquee-track">{row}{row}{row}{row}</div>
    </div>
  );
}
