import { useRef, useEffect, useCallback } from 'react';

interface Star {
  x: number;
  y: number;
  r: number;
  opacity: number;
  twinkleSpeed: number;
  twinklePhase: number;
  layer: number;
  hue: number;
}

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  trail: { x: number; y: number }[];
}

const STAR_COUNTS = [160, 90, 45]; // far, mid, near — increased for premium depth
const STAR_SPEEDS = [0.06, 0.15, 0.30];
const SHOOTING_STAR_INTERVAL = 4000;

export function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const shootingStarsRef = useRef<ShootingStar[]>([]);
  const rafRef = useRef<number>(0);
  const lastShootingStarRef = useRef(0);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });

  const initStars = useCallback((w: number, h: number) => {
    const stars: Star[] = [];
    STAR_COUNTS.forEach((count, layer) => {
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: layer === 0 ? 0.3 + Math.random() * 0.7 : layer === 1 ? 0.6 + Math.random() * 1.2 : 0.9 + Math.random() * 1.6,
          opacity: 0.2 + Math.random() * 0.8,
          twinkleSpeed: 0.003 + Math.random() * 0.025,
          twinklePhase: Math.random() * Math.PI * 2,
          layer,
          hue: 200 + Math.random() * 150, // 200-350: full blue-violet-warm spectrum
        });
      }
    });
    starsRef.current = stars;
  }, []);

  const spawnShootingStar = useCallback((w: number, h: number) => {
    const angle = -Math.PI / 4 + (Math.random() - 0.5) * 0.7;
    const speed = 5 + Math.random() * 7;
    shootingStarsRef.current.push({
      x: Math.random() * w * 0.7,
      y: Math.random() * h * 0.25,
      vx: Math.cos(angle) * speed,
      vy: Math.abs(Math.sin(angle)) * speed,
      life: 0,
      maxLife: 45 + Math.random() * 45,
      trail: [],
    });
  }, []);

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
      initStars(w, h);
    };

    resize();
    window.addEventListener('resize', resize);

    const handleMouse = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX / w, y: e.clientY / h };
    };
    window.addEventListener('mousemove', handleMouse, { passive: true });

    const animate = (time: number) => {
      const stars = starsRef.current;
      const shootingStars = shootingStarsRef.current;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      ctx.clearRect(0, 0, w, h);

      // ---- Premium nebula blobs — multi-layer with color breathing ----
      {
        const breathe = 1 + 0.15 * Math.sin(time * 0.0002);
        const nebulae = [
          // Large deep-space purple base
          { x: w * 0.15, y: h * 0.20, r: Math.min(w, h) * 0.38, color: '120, 40, 240', a: 0.05 },
          { x: w * 0.80, y: h * 0.55, r: Math.min(w, h) * 0.42, color: '60, 30, 200', a: 0.045 },
          // Mid-layer violet/magenta hot spots
          { x: w * 0.48, y: h * 0.68, r: Math.min(w, h) * 0.32, color: '160, 60, 230', a: 0.04 },
          { x: w * 0.72, y: h * 0.15, r: Math.min(w, h) * 0.30, color: '190, 80, 250', a: 0.035 },
          // Blue-cyan cool accents (near sidebar edge)
          { x: w * 0.08, y: h * 0.45, r: Math.min(w, h) * 0.26, color: '70, 140, 240', a: 0.03 },
          { x: w * 0.38, y: h * 0.35, r: Math.min(w, h) * 0.28, color: '80, 120, 220', a: 0.025 },
          // Warm orange/gold micro-nebulae (near black hole)
          { x: w * 0.88, y: h * 0.30, r: Math.min(w, h) * 0.22, color: '220, 90, 240', a: 0.02 },
          { x: w * 0.92, y: h * 0.48, r: Math.min(w, h) * 0.20, color: '240, 110, 220', a: 0.018 },
          // Subtle cyan wash top area
          { x: w * 0.55, y: h * 0.05, r: Math.min(w, h) * 0.24, color: '160, 120, 240', a: 0.015 },
        ];
        nebulae.forEach(n => {
          const gradient = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
          const baseAlpha = n.a * breathe;
          gradient.addColorStop(0, `rgba(${n.color}, ${baseAlpha})`);
          gradient.addColorStop(0.25, `rgba(${n.color}, ${baseAlpha * 0.7})`);
          gradient.addColorStop(0.5, `rgba(${n.color}, ${baseAlpha * 0.35})`);
          gradient.addColorStop(0.75, `rgba(${n.color}, ${baseAlpha * 0.1})`);
          gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // ---- Dust lanes — elongated elliptical gradients for depth ----
      {
        ctx.save();
        const dustLanes = [
          { x: w * 0.30, y: h * 0.50, rx: w * 0.55, ry: h * 0.06, rot: -0.15, a: 0.015 },
          { x: w * 0.60, y: h * 0.35, rx: w * 0.40, ry: h * 0.04, rot: 0.12, a: 0.012 },
        ];
        dustLanes.forEach(dl => {
          ctx.translate(dl.x, dl.y);
          ctx.rotate(dl.rot);
          const dustGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(dl.rx, dl.ry));
          dustGrad.addColorStop(0, `rgba(100, 60, 200, ${dl.a})`);
          dustGrad.addColorStop(0.4, `rgba(80, 40, 180, ${dl.a * 0.5})`);
          dustGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = dustGrad;
          ctx.beginPath();
          ctx.ellipse(0, 0, dl.rx, dl.ry, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.setTransform(1, 0, 0, 1, 0, 0);
        });
        ctx.restore();
      }

      // Stars with parallax and hue
      stars.forEach(star => {
        const parallaxX = (mx - 0.5) * star.layer * 10;
        const parallaxY = (my - 0.5) * star.layer * 10;
        let sx = star.x + parallaxX;
        let sy = star.y + parallaxY;

        // Drift
        star.y += STAR_SPEEDS[star.layer];
        if (star.y > h + 8) {
          star.y = -8;
          star.x = Math.random() * w;
        }
        if (star.y < -8) star.y = h + 8;

        // Twinkle
        star.twinklePhase += star.twinkleSpeed;
        const twinkle = 0.5 + 0.5 * Math.sin(star.twinklePhase);
        const baseOpacity = star.opacity;
        const finalOpacity = baseOpacity * (0.55 + 0.45 * twinkle);

        ctx.save();
        ctx.globalAlpha = finalOpacity;

        // Glow with hue
        const glowColor = `hsla(${star.hue}, 60%, 75%, 1)`;
        const glowColorMid = `hsla(${star.hue}, 50%, 65%, 0.5)`;

        const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, star.r * 3);
        gradient.addColorStop(0, glowColor);
        gradient.addColorStop(0.25, glowColorMid);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(sx, sy, star.r * 3, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = `hsla(${star.hue}, 20%, 95%, 1)`;
        ctx.beginPath();
        ctx.arc(sx, sy, star.r * 0.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      // Shooting stars
      if (time - lastShootingStarRef.current > SHOOTING_STAR_INTERVAL + Math.random() * 7000) {
        spawnShootingStar(w, h);
        lastShootingStarRef.current = time;
      }

      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const ss = shootingStars[i];
        ss.life++;
        ss.trail.push({ x: ss.x, y: ss.y });
        if (ss.trail.length > 35) ss.trail.shift();
        ss.x += ss.vx;
        ss.y += ss.vy;

        if (ss.life > ss.maxLife || ss.x > w + 30 || ss.y > h + 30) {
          shootingStars.splice(i, 1);
          continue;
        }

        const fade = 1 - ss.life / ss.maxLife;
        ctx.save();
        ctx.globalAlpha = fade;

        // Trail with gradient
        if (ss.trail.length > 1) {
          ctx.beginPath();
          ctx.moveTo(ss.trail[0].x, ss.trail[0].y);
          for (let j = 1; j < ss.trail.length; j++) {
            ctx.lineTo(ss.trail[j].x, ss.trail[j].y);
          }
          const trailGradient = ctx.createLinearGradient(
            ss.trail[0].x, ss.trail[0].y,
            ss.x, ss.y
          );
          trailGradient.addColorStop(0, 'rgba(200,180,255,0)');
          trailGradient.addColorStop(0.5, 'rgba(200,180,255,0.3)');
          trailGradient.addColorStop(1, 'rgba(220,200,255,0.6)');
          ctx.strokeStyle = trailGradient;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }

        // Head glow
        const headGlow = ctx.createRadialGradient(ss.x, ss.y, 0, ss.x, ss.y, 6);
        headGlow.addColorStop(0, 'rgba(255,255,255,1)');
        headGlow.addColorStop(0.3, 'rgba(220,200,255,0.7)');
        headGlow.addColorStop(0.6, 'rgba(180,150,240,0.2)');
        headGlow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = headGlow;
        ctx.beginPath();
        ctx.arc(ss.x, ss.y, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouse);
    };
  }, [initStars, spawnShootingStar]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}
