import Headline from '../ui/Headline';

export default function Glance({ counts, total, groups }) {
  const stats = [
    [total, 'species profiled'],
    [counts.CR, 'Critically Endangered'],
    [counts.EN, 'Endangered'],
    [counts.VU, 'Vulnerable'],
  ];
  return (
    <section className="bg-forest py-32">
      <div className="mx-auto grid w-[min(1320px,100%-36px)] gap-14 sm:w-[min(1320px,100%-56px)] lg:grid-cols-[1.1fr_.9fr]">
        <div>
          <span className="label" data-fade>Why it matters</span>
          <Headline className="mt-5 text-[clamp(2.4rem,5.2vw,4.8rem)]" lines={['Every species is a', ['thread in a ', { em: 'living web.' }]]} />
          <p className="mt-8 max-w-[560px] text-[1.05rem] text-muted" data-fade>
            When one animal declines, the forests, reefs and wetlands it belongs to feel it. WildSoul brings together the animals themselves, their closest relatives, the habitats they share and the pressures they face, so you can see how the story of one species connects to others.
          </p>
        </div>
        <dl className="grid grid-cols-2 content-end gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10" data-fade>
          {stats.map(([n, l]) => (
            <div key={l} className="bg-forest p-7">
              <dd className="font-serif text-[3.2rem] font-light leading-none text-lime">{n}</dd>
              <dt className="mt-2 text-[.78rem] uppercase tracking-[.14em] text-muted">{l}</dt>
            </div>
          ))}
          <div className="col-span-2 bg-forest p-6 text-[.8rem] text-botanical">Counts describe this atlas only, across {groups} animal groups. They are not global totals.</div>
        </dl>
      </div>
    </section>
  );
}
