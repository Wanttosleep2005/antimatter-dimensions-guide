import { useEffect, useRef } from 'react';

const PERF_KEY = 'ad-perf-mode';
const FPS_WINDOW = 30;
const LOW_FPS_THRESHOLD = 30;
const UPGRADE_THRESHOLD = 45;

/**
 * Start in LOW mode by default → fast first paint.
 * Upgrade to normal only if FPS stays consistently above threshold.
 * RAF loop STOPS after detection — no continuous polling.
 */
export function usePerformanceMonitor() {
  const perfModeRef = useRef<'low' | 'normal'>(
    localStorage.getItem(PERF_KEY) === 'normal' ? 'normal' : 'low',
  );

  useEffect(() => {
    const frames: number[] = [];
    let lastTime = performance.now();
    let raf = 0;

    const measure = (now: number) => {
      const delta = now - lastTime;
      lastTime = now;
      const fps = Math.min(60, 1000 / Math.max(delta, 1));
      frames.push(fps);

      if (frames.length >= FPS_WINDOW) {
        // Detection complete — STOP the loop
        cancelAnimationFrame(raf);
        const avg = frames.reduce((a, b) => a + b, 0) / frames.length;

        if (avg > UPGRADE_THRESHOLD && perfModeRef.current === 'low') {
          perfModeRef.current = 'normal';
          localStorage.setItem(PERF_KEY, 'normal');
          window.dispatchEvent(new Event('ad-perf-changed'));
        } else if (avg < LOW_FPS_THRESHOLD && perfModeRef.current === 'normal') {
          perfModeRef.current = 'low';
          localStorage.setItem(PERF_KEY, 'low');
          window.dispatchEvent(new Event('ad-perf-changed'));
        }
        return;
      }

      raf = requestAnimationFrame(measure);
    };

    raf = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(raf);
  }, []);

  return perfModeRef;
}

export function clearPerfCache() {
  const preserve = ['ad-guide-progress', 'ad-bookmarks', 'ad-hide-completed',
    'ad-recent-chapters', 'ad-search-history', 'ad-guide-fontsize',
    'ad-guide-last-chapter', 'ad-perf-mode', 'ad-scroll-pos-', 'ad-reading-days'];
  const keys = Object.keys(localStorage);
  for (const k of keys) {
    if (!preserve.some(p => k.startsWith(p))) localStorage.removeItem(k);
  }
}
