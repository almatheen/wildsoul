import './globals.css';
import SiteHeader from '../components/layout/SiteHeader';
import SiteFooter from '../components/layout/SiteFooter';
import MotionProvider from '../components/motion/MotionProvider';

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: { default: 'WildSoul: Endangered Species Atlas', template: '%s | WildSoul' },
  description:
    'Discover threatened species, the families they belong to, the places they live and the people protecting them. An educational atlas.',
};

export const viewport = { themeColor: '#0B1511', width: 'device-width', initialScale: 1 };

// Adds the "js" hook before first paint so reveal animations can start hidden, and installs
// a failsafe: if the animation layer never starts, everything is shown after 4 seconds.
const bootScript = `
document.documentElement.classList.add('js');
setTimeout(function(){ if(!window.__rvReady) document.documentElement.classList.add('rv-failsafe'); }, 4000);
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Fraunces + Inter. System serif/sans fallbacks are defined in globals.css. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;1,9..144,300;1,9..144,400&family=Inter:wght@300;400;500&display=swap"
        />
      </head>
      <body>
        <a
          href="#main"
          className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-full bg-lime px-5 py-2 text-sm text-forest transition-transform focus:translate-y-0"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
        <MotionProvider />
      </body>
    </html>
  );
}
