
'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * One scroll-reveal layer for the whole site.
 *
 * Data attributes:
 *   [data-lines]     Headline lines rise in sequence
 *   [data-fade]      Fade and lift into view
 *   [data-mask]      Clip-path image reveal
 *   [data-parallax]  Gentle vertical drift
 *   [data-draw]      SVG strokes draw themselves
 *
 * Animations are reverted on route changes and disabled when
 * the user prefers reduced motion.
 */
export default function MotionProvider() {
  const pathname = usePathname();

  useEffect(() => {
    window.__rvReady = true;

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    if (reduceMotion) {
      return undefined;
    }

    const ctx = gsap.context(() => {
      // Hero entrance: headline, supporting copy and background media.
      const hero = document.querySelector('[data-hero]');

      if (hero) {
        const media = hero.querySelector('[data-hero-media]');
        const inner = hero.querySelector('[data-hero-inner]');

        const timeline = gsap.timeline({
          defaults: { ease: 'expo.out' },
          delay: 0.15,
        });

        timeline
          .to('.hero-rule', {
            scaleX: 1,
            duration: 1.1,
          })
          .to(
            '[data-hero-lines] .line > span',
            {
              y: 0,
              duration: 1.4,
              stagger: 0.12,
            },
            '-=0.8',
          )
          .to(
            '[data-hero-fade]',
            {
              opacity: 1,
              y: 0,
              duration: 1,
              stagger: 0.1,
            },
            '-=1',
          );

        if (media) {
          gsap.fromTo(
            media,
            { scale: 1.3 },
            {
              scale: 1,
              duration: 2.4,
              ease: 'power3.out',
            },
          );

          gsap.to(media, {
            yPercent: 10,
            ease: 'none',
            scrollTrigger: {
              trigger: hero,
              start: 'top top',
              end: 'bottom top',
              scrub: true,
            },
          });
        }

        if (inner) {
          gsap.to(inner, {
            yPercent: -8,
            opacity: 0.25,
            ease: 'none',
            scrollTrigger: {
              trigger: hero,
              start: 'top top',
              end: 'bottom top',
              scrub: true,
            },
          });
        }
      }

      // Animate headline lines as they enter the viewport.
      gsap.utils.toArray('[data-lines]').forEach((element) => {
        const lines = Array.from(
          element.querySelectorAll('.line > span'),
        );

        if (lines.length === 0) return;

        gsap.to(lines, {
          y: 0,
          duration: 1.2,
          stagger: 0.1,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: element,
            start: 'top 90%',
            once: true,
          },
        });
      });

      // Batch fade-in animations.
      ScrollTrigger.batch('[data-fade]', {
        start: 'top 93%',
        once: true,
        onEnter: (batch) => {
          gsap.to(batch, {
            opacity: 1,
            y: 0,
            duration: 1,
            stagger: 0.09,
            ease: 'power3.out',
            overwrite: true,
          });
        },
      });

      // Reveal masked images and animate their inner photographs.
      gsap.utils.toArray('[data-mask]').forEach((element) => {
        const img = element.querySelector('.ph img, img');

        gsap.to(element, {
          clipPath: 'inset(0% 0% 0% 0%)',
          duration: 1.5,
          ease: 'expo.inOut',
          scrollTrigger: {
            trigger: element,
            start: 'top 88%',
            once: true,
          },
        });

        if (img) {
          gsap.fromTo(
            img,
            { scale: 1.25 },
            {
              scale: 1,
              duration: 2,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: element,
                start: 'top 88%',
                once: true,
              },
            },
          );
        }
      });

      // Parallax elements.
      gsap.utils.toArray('[data-parallax]').forEach((element) => {
        const value = Number.parseFloat(element.dataset.parallax) || 8;

        gsap.fromTo(
          element,
          { yPercent: -value },
          {
            yPercent: value,
            ease: 'none',
            scrollTrigger: {
              trigger: element.parentElement,
              start: 'top bottom',
              end: 'bottom top',
              scrub: true,
            },
          },
        );
      });

      // Draw SVG paths safely.
      gsap.utils.toArray('[data-draw]').forEach((svg) => {
        const paths = Array.from(
          svg.querySelectorAll('[data-draw-path]'),
        );

        if (paths.length === 0) return;

        paths.forEach((path) => {
          const length =
            typeof path.getTotalLength === 'function'
              ? path.getTotalLength()
              : 0;

          if (length > 0) {
            gsap.set(path, {
              strokeDasharray: length,
              strokeDashoffset: length,
              opacity: 1,
            });
          }
        });

        gsap.to(paths, {
          strokeDashoffset: 0,
          duration: 1.4,
          stagger: 0.05,
          ease: 'power2.inOut',
          scrollTrigger: {
            trigger: svg,
            start: 'top 80%',
            once: true,
          },
        });
      });
    });

    const refreshScrollTriggers = () => {
      ScrollTrigger.refresh();
    };

    window.addEventListener('load', refreshScrollTriggers);

    document.fonts?.ready?.then(refreshScrollTriggers);

    return () => {
      window.removeEventListener('load', refreshScrollTriggers);
      ctx.revert();
    };
  }, [pathname]);

  return null;
}
