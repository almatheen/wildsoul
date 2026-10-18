import Link from 'next/link';

export const GROUP_ICONS = {
  mammals: <><circle cx="32" cy="22" r="10" /><path d="M12 56c0-12 8-20 20-20s20 8 20 20M24 14l-4-8M40 14l4-8" /></>,
  birds: <path d="M8 36c14-24 32-22 48-6-12 2-18 8-24 22-4-8-14-12-24-16zM44 26l12-6" />,
  reptiles: <><ellipse cx="32" cy="34" rx="22" ry="14" /><path d="M32 20v28M18 26l28 16M46 26L18 42M54 30l8-4" /></>,
  amphibians: <><ellipse cx="32" cy="34" rx="16" ry="12" /><circle cx="24" cy="22" r="4" /><circle cx="40" cy="22" r="4" /><path d="M16 44l-8 10M48 44l8 10" /></>,
  fish: <path d="M6 32c12-16 30-16 42 0-12 16-30 16-42 0zM48 32l12-10v20z" />,
  invertebrates: <><circle cx="32" cy="32" r="8" /><path d="M32 24V8M32 56V40M24 32H8M56 32H40M26 26L14 14M50 50L38 38M38 26l12-12M14 50l12-12" /></>,
};

/** Light-surface group navigation, driven by the data (counts are real). */
export default function GroupTiles({ groups }) {
  return (
    <ul className="grid overflow-hidden rounded-[18px] border border-forest/15 sm:grid-cols-2 lg:grid-cols-6">
      {groups.map((g, i) => {
        const count = g.members.length;
        const inner = (
          <>
            <span className="text-[.7rem] tracking-[.2em] text-[#6b7b70] transition-colors group-hover:text-lime">0{i + 1}</span>
            <svg viewBox="0 0 64 64" className="h-[68px] w-[68px] fill-none stroke-current transition-all duration-700 group-hover:-rotate-12 group-hover:scale-110 group-hover:stroke-lime" strokeWidth="1" aria-hidden="true">{GROUP_ICONS[g.slug]}</svg>
            <div>
              <h3 className="font-serif text-[1.8rem] font-light leading-[1.1]">{g.name}</h3>
              <small className="mt-1.5 block text-[.78rem] text-[#5c6b61] transition-colors group-hover:text-muted">{count ? `${count} in this atlas` : 'None in the atlas yet'}</small>
            </div>
          </>
        );
        const cls = 'group relative flex min-h-[300px] flex-col justify-between overflow-hidden border-forest/15 p-7 text-forest transition-colors duration-500 sm:border-r lg:min-h-[360px] [&:nth-child(n)]:border-b lg:border-b-0';
        return (
          <li key={g.slug} className="contents">
            {count ? (
              <Link href={`/groups#${g.slug}`} className={`${cls} hover:text-ivory focus-visible:text-ivory`}>
                <span aria-hidden="true" className="absolute inset-0 -z-0 translate-y-full bg-forest transition-transform duration-700 ease-out group-hover:translate-y-0 group-focus-visible:translate-y-0" />
                <span className="relative z-10 flex h-full flex-col justify-between gap-8">{inner}</span>
              </Link>
            ) : (
              <div className={`${cls} opacity-55`}><span className="relative z-10 flex h-full flex-col justify-between gap-8">{inner}</span></div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
