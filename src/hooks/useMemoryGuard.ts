import { useEffect, useRef } from 'react';

/**
 * Monitor heap memory and dispatch events on pressure.
 * Chrome-only: uses performance.memory API.
 */
export function useMemoryGuard() {
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    const memory = (performance as any).memory;
    if (!memory) return;

    timerRef.current = setInterval(() => {
      const used = memory.usedJSHeapSize;
      const limit = memory.jsHeapSizeLimit;
      if (limit > 0 && used / limit > 0.8) {
        console.warn('[MemGuard] Heap pressure: ' + Math.round(used / 1024 / 1024) + 'MB / ' + Math.round(limit / 1024 / 1024) + 'MB');
        window.dispatchEvent(new Event('ad-memory-pressure'));
      }
    }, 10000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);
}
