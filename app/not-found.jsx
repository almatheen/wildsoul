import Link from 'next/link';

export const metadata = { title: 'Page not found' };

export default function NotFound() {
  return (
    <section className="bg-forest py-40 text-center">
      <div className="mx-auto w-[min(720px,100%-36px)]">
        <span className="label">Not found</span>
        <h1 className="serif mt-6 text-[clamp(2.6rem,8vw,5rem)]">This page is not in the <em>atlas</em></h1>
        <p className="mt-6 text-muted">The species or page you asked for does not exist. It may have been mistyped, or it may not be one of the 48 species in the catalogue.</p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link href="/species" className="btn btn-fill">Browse the atlas <span className="arr" aria-hidden="true">→</span></Link>
          <Link href="/" className="btn">Back to the start</Link>
        </div>
      </div>
    </section>
  );
}
