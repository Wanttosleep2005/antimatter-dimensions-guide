import { useEffect, useRef } from 'react';

const PERF_KEY = 'ad-perf-mode';
const FPS_WINDOW = 60; // frames to sample
const LOW_FPS_THRESHOLD = 25;

/**
 * Performance monitoring + auto-detection hook.
 * Returns:
 * - perfMode: 'low' | 'normal' — current performance tier
 * - setPerfMode: manually override
 * - fps: current FPS (approximate)
 *
 * Auto-detects low FPS after a short monitoring window and
 * persists the choice to localStorage.
 */
export function usePerformanceMonitor() {
  const fpsRef = useRef(60);
  const framesRef = useRef<number[]>([]);
  const perfModeRef = useRef<'low' | 'normal'>(
    (localStorage.getItem(PERF_KEY) as 'low' | 'normal') || 'normal',
  );
  const rafRef = useRef(0);
  const lastTimeRef = useRef(performance.now());

  useEffect(() => {
    let monitored = false;

    const measure = (now: number) => {
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;
      const fps = Math.min(60, 1000 / Math.max(delta, 1));
      fpsRef.current = Math.round(fps);

      if (!monitored) {
        framesRef.current.push(fps);
        if (framesRef.current.length >= FPS_WINDOW) {
          const avg = framesRef.current.reduce((a, b) => a + b, 0) / framesRef.current.length;
          monitored = true;
          if (avg < LOW_FPS_THRESHOLD && perfModeRef.current === 'normal') {
            perfModeRef.current = 'low';
            localStorage.setItem(PERF_KEY, 'low');
            window.dispatchEvent(new Event('ad-perf-changed'));
          }
        }
      }
      rafRef.current = requestAnimationFrame(measure);
    };

    rafRef.current = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return perfModeRef;
}

/** Clear canvas caches and force GC hint */
export function clearPerfCache() {
  // Remove cached offscreen canvas textures
  const keys = Object.keys(localStorage).filter((k) => k.startsWith('ad-'));
  // Keep progress/bookmarks/hide-completed/recent-chapters
  const preserve = ['ad-guide-progress', 'ad-bookmarks', 'ad-hide-completed', 'ad-recent-chapters', 'ad-search-history', 'ad-guide-fontsize', 'ad-guide-last-chapter', 'ad-perf-mode', 'ad-scroll-pos-', 'ad-reading-days'];
  for (const k of keys) {
    if (!preserve.some((p) => k.startsWith(p))) {
      localStorage.removeItem(k);
    }
  }
}
