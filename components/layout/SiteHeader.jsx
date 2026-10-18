'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const NAV = [
  { href: '/', label: 'Discover' },
  { href: '/species', label: 'Species' },
  { href: '/groups', label: 'Groups' },
  { href: '/conservation', label: 'Conservation' },
  { href: '/explore', label: 'Expedition' },
  { href: '/about', label: 'About' },
];

export function BrandMark({ className = 'w-[30px] h-[30px]' }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" stroke="#D4FF72" strokeWidth="2" aria-hidden="true">
      <circle cx="32" cy="32" r="28" />
      <path d="M32 50V20M32 38c-8-2-12-8-12-14 8 0 12 6 12 14zM32 32c7-2 11-7 11-13-7 0-11 5-11 13z" />
    </svg>
  );
}

const isActive = (pathname, href) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

export default function SiteHeader() {
  const pathname = usePathname();
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const burgerRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close on navigation
  useEffect(() => { setOpen(false); }, [pathname]);

  // Scroll lock, Escape to close, simple focus trap
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    if (!open) return undefined;
    const links = menuRef.current?.querySelectorAll('a') || [];
    links[0]?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') { setOpen(false); burgerRef.current?.focus(); }
      if (e.key === 'Tab' && links.length) {
        const first = burgerRef.current;
        const last = links[links.length - 1];
        if (e.shiftKey && document.activeElement === links[0]) { e.preventDefault(); first.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-[background,padding,backdrop-filter] duration-500 ease-out ${
          solid ? 'bg-ink/80 backdrop-blur-md py-3.5 border-b border-white/10' : 'py-6'
        }`}
      >
        <div className="mx-auto flex w-[min(1320px,100%-36px)] sm:w-[min(1320px,100%-56px)] items-center justify-between gap-6">
          <Link href="/" className="nav-drop flex items-center gap-3 font-serif text-[1.55rem] tracking-tight" style={{ '--i': 0 }} aria-label="WildSoul home">
            <BrandMark />
            <span>WildSoul</span>
          </Link>

          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="flex gap-9 text-[.82rem] tracking-wide text-muted">
              {NAV.map((n, i) => (
                <li key={n.href} className="nav-drop" style={{ '--i': i + 1 }}>
                  <Link href={n.href} className="nav-link" aria-current={isActive(pathname, n.href) ? 'page' : undefined}>
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <Link href="/species" className="btn nav-drop hidden lg:inline-flex" style={{ '--i': 8 }}>
            Explore Species <span className="arr" aria-hidden="true">→</span>
          </Link>

          <button
            ref={burgerRef}
            type="button"
            className="relative z-[60] h-11 w-11 lg:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((o) => !o)}
          >
            <i className={`absolute left-2.5 right-2.5 h-px bg-current transition-all duration-500 ease-out ${open ? 'top-[21px] rotate-45' : 'top-4'}`} />
            <i className={`absolute left-2.5 right-2.5 h-px bg-current transition-all duration-500 ease-out ${open ? 'top-[21px] -rotate-45' : 'top-[27px]'}`} />
          </button>
        </div>
      </header>

      <div
        id="mobile-menu"
        ref={menuRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        aria-hidden={!open}
        className={`fixed inset-0 z-[55] flex flex-col justify-center bg-forest-2 px-8 transition-[clip-path] duration-[800ms] ease-out lg:hidden ${open ? 'visible' : 'invisible delay-[800ms]'}`}
        style={{ clipPath: open ? 'circle(150% at calc(100% - 40px) 40px)' : 'circle(0 at calc(100% - 40px) 40px)' }}
      >
        <nav aria-label="Mobile">
          {NAV.map((n, i) => (
            <Link
              key={n.href}
              href={n.href}
              tabIndex={open ? 0 : -1}
              className="block border-b border-white/10 py-2 font-serif text-[2.4rem] font-light transition-all duration-700 ease-out"
              style={{ opacity: open ? 1 : 0, transform: open ? 'none' : 'translateY(20px)', transitionDelay: open ? `${250 + i * 55}ms` : '0ms' }}
              aria-current={isActive(pathname, n.href) ? 'page' : undefined}
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
