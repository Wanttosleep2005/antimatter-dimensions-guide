import { useEffect, useState, useRef } from 'react';

export function ReadingProgress() {
  const [pct, setPct] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const handleScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        setPct(docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0);
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="阅读进度"
      className="fixed top-0 left-0 right-0 z-20 h-[2px] lg:left-[var(--sidebar-width)]"
      style={{ background: 'transparent' }}
    >
      <div
        className="h-full transition-all duration-150"
        style={{
          width: `${pct}%`,
          background: 'linear-gradient(90deg, var(--accent-color), var(--accent2-color))',
          boxShadow: '0 0 10px var(--accent-glow), 0 0 20px rgba(168,128,255,0.15)',
        }}
      />
    </div>
  );
}
