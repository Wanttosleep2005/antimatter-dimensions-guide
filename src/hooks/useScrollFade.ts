import { useEffect, useRef } from 'react';

/**
 * Scroll-triggered fade + shrink for content sections as they scroll out
 * of the viewport at the top. Replaces the static CSS mask-image approach.
 *
 * How it works:
 * - Watches all .guide-section elements
 * - As each section scrolls above the viewport, progressively applies
 *   opacity → 0 and scale → 0.85 over a configurable distance
 * - Sections fully scrolled past become hidden
 */

interface ScrollFadeOptions {
  /** How far above the viewport (px) a section must scroll to fully disappear (default 280) */
  fadeDistance?: number;
  /** Minimum scale factor when fully faded (default 0.85) */
  minScale?: number;
}

export function useScrollFade(options: ScrollFadeOptions = {}) {
  const { fadeDistance = 280, minScale = 0.85 } = options;
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>('.guide-section');
    if (sections.length === 0) return;

    const handleScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      rafRef.current = requestAnimationFrame(() => {
        sections.forEach((section) => {
          const rect = section.getBoundingClientRect();
          const bottom = rect.bottom;

          if (bottom <= 0) {
            // Fully above viewport — completely hidden
            section.style.opacity = '0';
            section.style.transform = `scale(${minScale})`;
            section.style.pointerEvents = 'none';
          } else if (bottom <= fadeDistance) {
            // Transitioning out — progressive fade + shrink
            const progress = bottom / fadeDistance; // 1 → 0
            const eased = progress * progress; // quadratic ease for smoother feel
            const currentScale = minScale + (1 - minScale) * eased;
            section.style.opacity = String(eased);
            section.style.transform = `scale(${currentScale})`;
            section.style.pointerEvents = 'auto';
          } else {
            // Fully visible — reset
            section.style.opacity = '1';
            section.style.transform = 'scale(1)';
            section.style.pointerEvents = 'auto';
          }
        });
      });
    };

    // Initial setup
    sections.forEach((section) => {
      section.style.transition = 'none';
      section.style.willChange = 'opacity, transform';
    });

    // Small delay then enable transitions
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        sections.forEach((section) => {
          section.style.transition =
            'opacity 0.3s ease-out, transform 0.3s ease-out';
        });
      });
    });

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // initial call

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      sections.forEach((section) => {
        section.style.opacity = '';
        section.style.transform = '';
        section.style.transition = '';
        section.style.willChange = '';
        section.style.pointerEvents = '';
      });
    };
  }, [fadeDistance, minScale]);
}
