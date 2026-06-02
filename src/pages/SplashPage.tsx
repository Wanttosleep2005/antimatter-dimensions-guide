import { useRef, useEffect, useState, useCallback } from 'react';

interface SplashProps {
  onEnter: () => void;
}

interface SplashParticle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number; hue: number;
}

/**
 * SplashPage — cinematic launch screen.
 * Inspired by Apple's product reveals + ElevenLabs text-first philosophy.
 * Full-screen dark canvas, ∞ sigil, particle burst, single CTA, fade-out transition.
 */
export function SplashPage({ onEnter }: SplashProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fadeOut, setFadeOut] = useState(false);
  const [visible, setVisible] = useState(false);
  const particlesRef = useRef<SplashParticle[]>([]);
  const rafRef = useRef(0);
  const timeRef = useRef(0);
  const burstDone = useRef(false);

  const centerX = typeof window !== 'undefined' ? window.innerWidth / 2 : 0;
  const centerY = typeof window !== 'undefined' ? window.innerHeight / 2 : 0;

  const spawnBurst = useCallback(() => {
    const particles: SplashParticle[] = [];
    const dirs = 36; // 36 radial directions
    for (let d = 0; d < dirs; d++) {
      const angle = (d / dirs) * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4;
      for (let s = 0; s < 3; s++) {
        particles.push({
          x: centerX, y: centerY - 20,
          vx: Math.cos(angle) * speed * (0.6 + Math.random() * 0.8),
          vy: Math.sin(angle) * speed * (0.6 + Math.random() * 0.8),
          life: 0,
          maxLife: 60 + Math.random() * 80,
          size: 1.2 + Math.random() * 2.8,
          hue: 250 + Math.random() * 60, // violet-blue spectrum
        });
      }
    }
    particlesRef.current = particles;
  }, [centerX, centerY]);

  useEffect(() => {
    // Staggered visibility for entrance animation
    const t1 = setTimeout(() => setVisible(true), 100);
    const t2 = setTimeout(() => spawnBurst(), 300);

    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [spawnBurst]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = window.innerWidth;
    let h = window.innerHeight;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
    };
    resize();
    window.addEventListener('resize', resize);

    // Static background stars
    const bgStars: { x: number; y: number; r: number; opacity: number }[] = [];
    for (let i = 0; i < 150; i++) {
      bgStars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.3 + Math.random() * 1.4,
        opacity: 0.15 + Math.random() * 0.5,
      });
    }

    const animate = (timestamp: number) => {
      timeRef.current = timestamp;
      ctx.clearRect(0, 0, w, h);

      // Background stars
      for (const s of bgStars) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200, 210, 255, ${s.opacity})`;
        ctx.fill();
      }

      // Center ambient glow
      const glowGrad = ctx.createRadialGradient(centerX, centerY - 10, 0, centerX, centerY - 10, Math.min(w, h) * 0.5);
      glowGrad.addColorStop(0, 'rgba(124, 92, 240, 0.08)');
      glowGrad.addColorStop(0.3, 'rgba(80, 50, 180, 0.04)');
      glowGrad.addColorStop(0.6, 'rgba(40, 20, 100, 0.015)');
      glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, w, h);

      // Animated ring around sigil
      const ringRadius = Math.min(w, h) * 0.13;
      const ringAlpha = 0.12 + 0.04 * Math.sin(timestamp * 0.002);
      ctx.beginPath();
      ctx.arc(centerX, centerY - 10, ringRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(140, 100, 240, ${ringAlpha})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Second ring — counter-rotating illusion
      ctx.beginPath();
      const ring2Angle = timestamp * 0.0006;
      ctx.ellipse(centerX, centerY - 10, ringRadius * 1.25, ringRadius * 0.85, ring2Angle, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(100, 70, 200, ${ringAlpha * 0.5})`;
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Particles
      const pList = particlesRef.current;
      for (let i = pList.length - 1; i >= 0; i--) {
        const p = pList[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.985;
        p.vy *= 0.985;
        p.life++;
        if (p.life > p.maxLife) { pList.splice(i, 1); continue; }

        const fade = 1 - p.life / p.maxLife;
        const easeFade = fade < 0.2 ? fade / 0.2 : fade;
        const alpha = easeFade * 0.45;

        const pGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
        pGrad.addColorStop(0, `hsla(${p.hue}, 60%, 75%, ${alpha})`);
        pGrad.addColorStop(0.3, `hsla(${p.hue}, 50%, 60%, ${alpha * 0.6})`);
        pGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = pGrad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Spawn secondary burst at ~2s
      if (timestamp > 2200 && !burstDone.current) {
        burstDone.current = true;
        const secondary: SplashParticle[] = [];
        for (let i = 0; i < 40; i++) {
          const a = Math.random() * Math.PI * 2;
          const spd = 1 + Math.random() * 2.5;
          secondary.push({
            x: centerX, y: centerY - 10,
            vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
            life: 0, maxLife: 40 + Math.random() * 50,
            size: 0.8 + Math.random() * 1.5,
            hue: 270 + Math.random() * 80,
          });
        }
        particlesRef.current = [...particlesRef.current, ...secondary];
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [centerX, centerY]);

  const handleEnter = () => {
    setFadeOut(true);
    setTimeout(() => onEnter(), 700);
  };

  return (
    <div
      className={`fixed inset-0 z-[300] flex flex-col items-center justify-center bg-[#020204] overflow-hidden select-none ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ transition: 'opacity 0.7s cubic-bezier(0.4, 0, 0.2, 1)' }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Content layer */}
      <div
        className={`relative z-10 flex flex-col items-center gap-8 px-6 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
        style={{ transition: 'opacity 0.8s cubic-bezier(0.16,1,0.3,1) 0.15s, transform 0.8s cubic-bezier(0.16,1,0.3,1) 0.15s' }}
      >
        {/* Sigil — Atomic structure icon */}
        <div className="relative mb-2">
          <div
            className="w-28 h-28 sm:w-36 sm:h-36 grid place-items-center rounded-[1.6rem]"
            style={{
              background: 'radial-gradient(circle at 35% 25%, rgba(255,255,255,0.15), transparent 40%), linear-gradient(135deg, #7c5cf0, #4f46e5)',
              boxShadow: '0 20px 60px rgba(124,92,240,0.35), 0 0 120px rgba(124,92,240,0.12), inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
          >
            <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Hex ring */}
              <path d="M28 4L52 16V40L28 52L4 40V16L28 4Z"
                stroke="rgba(255,255,255,0.4)" strokeWidth="1.2" fill="none" />
              {/* Orbit rings */}
              <ellipse cx="28" cy="28" rx="20" ry="8" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8"
                transform="rotate(-30 28 28)" fill="none" />
              <ellipse cx="28" cy="28" rx="20" ry="8" stroke="rgba(255,255,255,0.22)" strokeWidth="0.6"
                transform="rotate(30 28 28)" fill="none" />
              <ellipse cx="28" cy="28" rx="20" ry="8" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5"
                fill="none" />
              {/* Core */}
              <circle cx="28" cy="28" r="7" fill="rgba(255,255,255,0.95)" />
              <circle cx="28" cy="28" r="4" fill="rgba(124,92,240,0.55)" />
              {/* Electron dots */}
              <circle cx="44" cy="20" r="2" fill="rgba(255,255,255,0.85)" />
              <circle cx="12" cy="36" r="1.6" fill="rgba(255,255,255,0.65)" />
              <circle cx="36" cy="44" r="1.8" fill="rgba(255,255,255,0.75)" />
            </svg>
          </div>
          {/* Pulse ring */}
          <div className="absolute -inset-3 rounded-[2.2rem] border-2 border-[rgba(124,92,240,0.25)] animate-[pulse-ring_2.6s_ease-out_infinite]" />
        </div>

        {/* Title */}
        <h1
          className="text-center m-0"
          style={{
            fontFamily: '"Outfit","Noto Sans SC","Microsoft YaHei",system-ui,sans-serif',
            fontSize: 'clamp(2.4rem, 5vw, 4.2rem)',
            fontWeight: 800,
            letterSpacing: '-0.025em',
            lineHeight: 1.05,
            color: '#ededf4',
            maxWidth: '48rem',
          }}
        >
          反物质维度攻略
        </h1>

        {/* Subtitle — ElevenLabs-style restrained secondary text */}
        <p
          className="text-center m-0"
          style={{
            fontFamily: '"Inter Variable","Inter","Noto Sans SC",system-ui,sans-serif',
            fontSize: 'clamp(1rem, 2vw, 1.3rem)',
            fontWeight: 350,
            lineHeight: 1.6,
            color: '#7a7598',
            maxWidth: '36rem',
          }}
        >
          从无限到 Celestial · 20 章 · 12 万字<br />
          最完整的 Antimatter Dimensions 中文通关指南
        </p>

        {/* CTA — Apple-inspired pill button */}
        <button
          type="button"
          onClick={handleEnter}
          className="relative overflow-hidden mt-4"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '3rem',
            padding: '0.75rem 2.5rem',
            borderRadius: '2rem',
            border: '1px solid rgba(124,92,240,0.25)',
            background: 'rgba(124,92,240,0.12)',
            backdropFilter: 'blur(12px)',
            color: '#ededf4',
            fontFamily: '"Inter Variable","Inter","Noto Sans SC",system-ui,sans-serif',
            fontSize: '1rem',
            fontWeight: 600,
            letterSpacing: '-0.01em',
            cursor: 'pointer',
            transition: 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.borderColor = 'rgba(124,92,240,0.5)';
            e.currentTarget.style.background = 'rgba(124,92,240,0.22)';
            e.currentTarget.style.boxShadow = '0 8px 32px rgba(124,92,240,0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.borderColor = 'rgba(124,92,240,0.25)';
            e.currentTarget.style.background = 'rgba(124,92,240,0.12)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          进入指南
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ marginLeft: 8 }}>
            <path d="M3 8h10M9 4l4 4-4 4" />
          </svg>
        </button>

        {/* Bottom hint — subtle scroll/click indicator */}
        <p
          className="text-center m-0"
          style={{
            fontFamily: '"Inter Variable","Inter",system-ui,sans-serif',
            fontSize: '0.78rem',
            fontWeight: 400,
            color: '#4a4570',
            letterSpacing: '0.04em',
          }}
        >
          点击按钮或按 Enter 键开始
        </p>
      </div>
    </div>
  );
}
