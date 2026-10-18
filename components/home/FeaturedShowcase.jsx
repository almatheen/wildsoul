'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SpeciesImage from '../ui/SpeciesImage';
import SpeciesCard from '../species/SpeciesCard';
import StatusBadge from '../ui/StatusBadge';

gsap.registerPlugin(ScrollTrigger);

/**
 * Desktop: a pinned stage; scrolling steps through the species with a masked wipe.
 * Names are real buttons, so it is fully usable without scrolling or with reduced motion.
 * Mobile: a plain vertical list of cards (no pinning).
 */
export default function FeaturedShowcase({ items }) {
  const root = useRef(null);
  const stage = useRef(null);
  const st = useRef(null);
  const zRef = useRef(1);
  const [idx, setIdx] = useState(0);
  const prev = useRef(0);
  const n = items.length;

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mm = gsap.matchMedia();
    mm.add('(min-width: 1024px)', () => {
      if (reduce || !stage.current) return undefined;
      const trigger = ScrollTrigger.create({
        trigger: root.current,
        start: 'top top',
        end: `+=${n * 70}%`,
        pin: true,
        anticipatePin: 1,
        onUpdate: (self) => {
          gsap.set('#show-rail', { scaleY: self.progress });
          setIdx(Math.min(n - 1, Math.floor(self.progress * n)));
        },
      });
      st.current = trigger;
      return () => { trigger.kill(); st.current = null; };
    });
    return () => mm.revert();
  }, [n]);

  // wipe transition when the active species changes
  useEffect(() => {
    if (!stage.current || prev.current === idx) return;
    prev.current = idx;
    const frame = stage.current.querySelectorAll('[data-frame]')[idx];
    const info = stage.current.querySelectorAll('[data-info] > *');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!frame) return;
    frame.style.zIndex = String(++zRef.current);
    if (reduce) { frame.style.clipPath = 'inset(0)'; return; }
    gsap.fromTo(frame, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'expo.inOut' });
    const img = frame.querySelector('img');
    if (img) gsap.fromTo(img, { scale: 1.25 }, { scale: 1, duration: 1.8, ease: 'power3.out' });
    gsap.fromTo(info, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.07, ease: 'power3.out' });
  }, [idx]);

  const choose = (i) => {
    if (st.current) {
      const { start, end } = st.current;
      window.scrollTo({ top: start + ((i + 0.5) / n) * (end - start), behavior: 'smooth' });
    } else setIdx(i);
  };
  const cur = items[idx];

  return (
    <section ref={root} aria-label="Featured wildlife" className="bg-ink">
      {/* mobile / tablet */}
      <div className="py-24 lg:hidden">
        <div className="mx-auto w-[min(1320px,100%-36px)] sm:w-[min(1320px,100%-56px)]">
          <span className="label">Featured wildlife</span>
          <h2 className="serif mt-5 text-[clamp(2.4rem,9vw,4rem)]">Faces of a <em>fragile</em> world</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {items.map((s) => <SpeciesCard key={s.slug} s={s} />)}
          </div>
        </div>
      </div>

      {/* desktop pinned stage */}
      <div ref={stage} className="hidden h-screen grid-cols-[.9fr_1.1fr] items-center gap-14 px-[clamp(28px,5vw,80px)] lg:grid">
        <div className="relative z-10 flex flex-col gap-7">
          <span className="label">Featured wildlife</span>
          <ol className="grid gap-0.5">
            {items.map((s, i) => (
              <li key={s.slug}>
                <button
                  type="button"
                  onClick={() => choose(i)}
                  aria-current={i === idx}
                  className={`flex items-baseline gap-[18px] text-left font-serif text-[clamp(1.8rem,3.4vw,3.2rem)] font-light leading-[1.12] transition-all duration-500 ease-out ${i === idx ? 'translate-x-3.5 text-ivory' : 'text-ivory/30 hover:text-ivory/65'}`}
                >
                  <small className={`min-w-[26px] font-sans text-[.66rem] tracking-[.2em] transition-colors ${i === idx ? 'text-lime' : 'text-botanical'}`}>0{i + 1}</small>
                  {s.name}
                </button>
              </li>
            ))}
          </ol>
          <div data-info className="max-w-[480px] border-t border-white/10 pt-6" aria-live="polite">
            <StatusBadge code={cur.statusCode} label={cur.statusLabel} />
            <p className="sci my-3 text-muted">{cur.scientificName}</p>
            <p className="line-clamp-4 text-[.95rem] text-muted">{cur.tagline}</p>
            <Link href={`/species/${cur.slug}`} className="btn mt-6">Open profile <span className="arr" aria-hidden="true">→</span></Link>
          </div>
        </div>

        <div className="relative h-[min(78vh,760px)] overflow-hidden rounded-[240px_240px_18px_18px] border border-white/10">
          {items.map((s, i) => (
            <div key={s.slug} data-frame className="shade-b absolute inset-0" style={{ clipPath: i === 0 ? 'inset(0% 0% 0% 0%)' : 'inset(100% 0% 0% 0%)' }}>
              <SpeciesImage species={s} />
              <span className="absolute bottom-5 left-6 z-10 text-[.62rem] uppercase tracking-[.2em] text-ivory/80">{s.family} · {s.region}</span>
            </div>
          ))}
          <div aria-hidden="true" className="absolute right-6 top-1/2 z-20 h-[140px] w-0.5 -translate-y-1/2 bg-white/15">
            <i id="show-rail" className="absolute inset-0 origin-top bg-lime" style={{ transform: 'scaleY(0)' }} />
          </div>
        </div>
      </div>
    </section>
  );
}
