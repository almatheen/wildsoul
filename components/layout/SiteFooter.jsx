import Link from 'next/link';
import { BrandMark } from './SiteHeader';

const COLS = [
  { title: 'Explore', links: [['/species', 'Species atlas'], ['/groups', 'Groups & relations'], ['/conservation', 'Conservation'], ['/explore', 'Expedition']] },
  { title: 'Project', links: [['/about', 'About'], ['/about#methodology', 'Methodology'], ['/about#sources', 'Sources & limits']] },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-ink pb-9 pt-[76px]">
      <div className="mx-auto w-[min(1320px,100%-36px)] sm:w-[min(1320px,100%-56px)]">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1.2fr]">
          <div>
            <Link href="/" className="flex items-center gap-3 font-serif text-[1.55rem]" aria-label="WildSoul home">
              <BrandMark /> <span>WildSoul</span>
            </Link>
            <p className="mt-4 max-w-[330px] text-[.9rem] text-muted">
              An educational atlas of threatened species: where they live, what they are related to, what endangers them and what is being done.
            </p>
          </div>
          {COLS.map((c) => (
            <div key={c.title}>
              <h2 className="mb-[18px] text-[.7rem] font-medium uppercase tracking-[.2em] text-lime">{c.title}</h2>
              <ul>
                {c.links.map(([href, label]) => (
                  <li key={href} className="mb-2.5 text-[.9rem] text-muted">
                    <Link href={href} className="transition-colors hover:text-ivory">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h2 className="mb-[18px] text-[.7rem] font-medium uppercase tracking-[.2em] text-lime">Reference sources</h2>
            <ul className="text-[.9rem] text-muted">
              <li className="mb-2.5"><a className="transition-colors hover:text-ivory" href="https://www.iucnredlist.org/" target="_blank" rel="noopener noreferrer">IUCN Red List</a></li>
              <li className="mb-2.5"><a className="transition-colors hover:text-ivory" href="https://commons.wikimedia.org/" target="_blank" rel="noopener noreferrer">Wikimedia Commons (photographs)</a></li>
              <li className="mb-2.5"><a className="transition-colors hover:text-ivory" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-14 flex flex-wrap justify-between gap-5 border-t border-white/10 pt-6 text-[.74rem] text-botanical">
          <span>© WildSoul. Educational use. Photographs belong to their authors and are used under their stated licences.</span>
          <span>Population figures in this release are unverified. See Methodology.</span>
        </div>
      </div>
    </footer>
  );
}
