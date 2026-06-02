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
  // Offscreen galaxy texture — rendered once, rotated per frame
  const galaxyTexRef = useRef<HTMLCanvasElement | null>(null);
  const galaxyDims = useRef({ gx: 0, gy: 0, gR: 0 });

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

    /** Build Carina Nebula texture on an offscreen canvas */
    const buildNebulaTexture = () => {
      const gx = w * 0.35;
      const gy = h * 0.48;
      const gR = Math.min(w, h) * 0.30;
      galaxyDims.current = { gx, gy, gR };

      const size = Math.ceil(gR * 2.5);
      const off = document.createElement('canvas');
      off.width = size;
      off.height = size;
      const o = off.getContext('2d')!;
      const cx = size / 2;
      const cy = size / 2;

      // --- 1. Deep outer glow (faint red-brown halo) ---
      const outerGlow = o.createRadialGradient(cx, cy, gR * 0.3, cx, cy, gR * 1.2);
      outerGlow.addColorStop(0, 'rgba(60, 10, 5, 0)');
      outerGlow.addColorStop(0.2, 'rgba(80, 20, 10, 0.04)');
      outerGlow.addColorStop(0.5, 'rgba(40, 8, 3, 0.06)');
      outerGlow.addColorStop(0.8, 'rgba(15, 2, 1, 0.025)');
      outerGlow.addColorStop(1, 'rgba(0,0,0,0)');
      o.fillStyle = outerGlow;
      o.beginPath(); o.ellipse(cx, cy, gR * 1.2, gR * 0.9, 0, 0, Math.PI * 2); o.fill();

      // --- 2. Warm emission gas clouds (H-alpha red/orange regions) ---
      const gasBlobs = [
        { x: -0.15, y: -0.05, r: 0.55, c: '255, 80, 30', a: 0.07 },   // main orange glow
        { x: 0.10, y: -0.15, r: 0.45, c: '255, 60, 20', a: 0.055 },   // upper hot spot
        { x: -0.20, y: 0.10, r: 0.40, c: '240, 70, 35', a: 0.05 },    // lower left glow
        { x: 0.15, y: 0.05, r: 0.38, c: '255, 90, 40', a: 0.045 },    // right warm area
        { x: 0.00, y: 0.18, r: 0.35, c: '220, 55, 25', a: 0.04 },     // bottom emission
        { x: -0.10, y: -0.25, r: 0.32, c: '255, 70, 25', a: 0.035 },  // top plume
        { x: 0.20, y: -0.08, r: 0.30, c: '230, 65, 30', a: 0.03 },    // right hotspot
        { x: -0.25, y: -0.18, r: 0.28, c: '240, 75, 35', a: 0.028 },  // far left
      ];
      for (const gb of gasBlobs) {
        const bx = cx + gb.x * gR;
        const by = cy + gb.y * gR;
        const br = gb.r * gR;
        const grad = o.createRadialGradient(bx, by, 0, bx, by, br);
        grad.addColorStop(0, `rgba(${gb.c}, ${gb.a})`);
        grad.addColorStop(0.3, `rgba(${gb.c}, ${gb.a * 0.7})`);
        grad.addColorStop(0.6, `rgba(${gb.c}, ${gb.a * 0.25})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        o.fillStyle = grad;
        o.beginPath(); o.arc(bx, by, br, 0, Math.PI * 2); o.fill();
      }

      // --- 3. Blue reflection nebulae (scattered starlight) ---
      const blueBlobs = [
        { x: 0.25, y: -0.20, r: 0.22, a: 0.03 },
        { x: -0.30, y: -0.10, r: 0.20, a: 0.025 },
        { x: 0.10, y: 0.22, r: 0.18, a: 0.02 },
      ];
      for (const bb of blueBlobs) {
        const bx = cx + bb.x * gR;
        const by = cy + bb.y * gR;
        const br = bb.r * gR;
        const bGrad = o.createRadialGradient(bx, by, 0, bx, by, br);
        bGrad.addColorStop(0, `rgba(120, 180, 255, ${bb.a * 1.2})`);
        bGrad.addColorStop(0.4, `rgba(100, 150, 240, ${bb.a * 0.7})`);
        bGrad.addColorStop(0.8, `rgba(60, 100, 200, ${bb.a * 0.2})`);
        bGrad.addColorStop(1, 'rgba(0,0,0,0)');
        o.fillStyle = bGrad;
        o.beginPath(); o.arc(bx, by, br, 0, Math.PI * 2); o.fill();
      }

      // --- 4. Dark dust pillars (molecular clouds, Keyhole) ---
      const drawPillar = (px: number, py: number, pw: number, ph: number, rot: number) => {
        o.save();
        o.translate(cx + px * gR, cy + py * gR);
        o.rotate(rot);
        const pGrad = o.createLinearGradient(0, -ph, 0, ph * 0.3);
        pGrad.addColorStop(0, 'rgba(2, 1, 3, 0.85)');
        pGrad.addColorStop(0.4, 'rgba(3, 2, 5, 0.6)');
        pGrad.addColorStop(0.7, 'rgba(5, 3, 8, 0.25)');
        pGrad.addColorStop(1, 'rgba(0,0,0,0)');
        o.fillStyle = pGrad;
        o.beginPath();
        // Irregular pillar shape (trapezoid with jagged top)
        o.moveTo(-pw * 0.3, -ph * 0.2);
        o.lineTo(-pw * 0.6, -ph);
        o.lineTo(-pw * 0.2, -ph * 0.9);
        o.lineTo(pw * 0.1, -ph * 0.95);
        o.lineTo(pw * 0.5, -ph * 0.7);
        o.lineTo(pw * 0.3, -ph * 0.15);
        o.fill();
        o.restore();
      };

      // Keyhole dark region (center-right)
      drawPillar(0.05, -0.05, 0.18, 0.55, 0.15);
      // Left dark pillar
      drawPillar(-0.20, -0.08, 0.14, 0.45, -0.2);
      // Upper tendril
      drawPillar(0.12, -0.2, 0.10, 0.35, 0.3);
      // Lower dark cloud
      drawPillar(-0.05, 0.12, 0.15, 0.30, 0.05);

      // --- 5. Wispy tendrils (thin filamentary structure) ---
      for (let w = 0; w < 60; w++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = gR * (0.1 + Math.random() * 0.7);
        const wx = cx + Math.cos(angle) * dist;
        const wy = cy + Math.sin(angle) * dist;
        const wLen = gR * (0.04 + Math.random() * 0.15);
        const wAngle = angle + (Math.random() - 0.5) * 1.2;

        o.save();
        o.translate(wx, wy);
        o.rotate(wAngle);
        const wGrad = o.createLinearGradient(0, 0, wLen, 0);
        const wAlpha = 0.008 + Math.random() * 0.02;
        wGrad.addColorStop(0, `rgba(200, 120, 80, ${wAlpha})`);
        wGrad.addColorStop(0.5, `rgba(180, 100, 60, ${wAlpha * 0.6})`);
        wGrad.addColorStop(1, 'rgba(0,0,0,0)');
        o.fillStyle = wGrad;
        o.fillRect(0, -0.8, wLen, 1.6);
        o.restore();
      }

      // --- 6. Eta Carinae analog — central bright star system ---
      const etaGrad = o.createRadialGradient(cx + gR * 0.05, cy - gR * 0.08, 0,
                                              cx + gR * 0.05, cy - gR * 0.08, gR * 0.12);
      etaGrad.addColorStop(0, 'rgba(255, 250, 240, 0.5)');
      etaGrad.addColorStop(0.01, 'rgba(255, 240, 210, 0.3)');
      etaGrad.addColorStop(0.05, 'rgba(255, 200, 140, 0.12)');
      etaGrad.addColorStop(0.15, 'rgba(200, 100, 60, 0.04)');
      etaGrad.addColorStop(0.35, 'rgba(100, 30, 20, 0.01)');
      etaGrad.addColorStop(1, 'rgba(0,0,0,0)');
      o.fillStyle = etaGrad;
      o.beginPath(); o.arc(cx + gR * 0.05, cy - gR * 0.08, gR * 0.12, 0, Math.PI * 2); o.fill();

      // Eta Carinae 4-point diffraction spike
      o.save();
      o.translate(cx + gR * 0.05, cy - gR * 0.08);
      o.globalAlpha = 0.15;
      for (let s = 0; s < 4; s++) {
        const sa = (s / 4) * Math.PI * 2 + 0.4;
        const sLen = gR * 0.08;
        const spikeGrad = o.createLinearGradient(0, 0, Math.cos(sa) * sLen, Math.sin(sa) * sLen);
        spikeGrad.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
        spikeGrad.addColorStop(0.1, 'rgba(200, 220, 255, 0.2)');
        spikeGrad.addColorStop(1, 'rgba(0,0,0,0)');
        o.fillStyle = spikeGrad;
        o.beginPath();
        o.moveTo(Math.cos(sa - 0.08) * gR * 0.005, Math.sin(sa - 0.08) * gR * 0.005);
        o.lineTo(Math.cos(sa) * sLen, Math.sin(sa) * sLen);
        o.lineTo(Math.cos(sa + 0.08) * gR * 0.005, Math.sin(sa + 0.08) * gR * 0.005);
        o.fill();
      }
      o.restore();

      // --- 7. Star clusters (Trumpler 14/16 analogs) ---
      const starClusters = [
        { x: 0.05, y: -0.08, count: 80, r: 0.08, core: 'warm' },   // near Eta Carinae
        { x: -0.15, y: -0.18, count: 50, r: 0.06, core: 'blue' },   // upper left cluster
        { x: 0.20, y: 0.05, count: 40, r: 0.05, core: 'mixed' },    // right cluster
        { x: -0.08, y: 0.15, count: 35, r: 0.05, core: 'warm' },    // lower cluster
      ];
      for (const sc of starClusters) {
        for (let i = 0; i < sc.count; i++) {
          const sAngle = Math.random() * Math.PI * 2;
          const sDist = Math.random() * sc.r * gR;
          const sx = cx + sc.x * gR + Math.cos(sAngle) * sDist;
          const sy = cy + sc.y * gR + Math.sin(sAngle) * sDist;
          const isBright = Math.random() > 0.7;
          const alpha = isBright ? 0.06 + Math.random() * 0.06 : 0.02 + Math.random() * 0.04;

          const color = sc.core === 'blue'
            ? 'rgba(180, 210, 255, 0.9)'
            : sc.core === 'warm'
              ? 'rgba(255, 235, 200, 0.85)'
              : (Math.random() > 0.5 ? 'rgba(255, 235, 200, 0.85)' : 'rgba(180, 210, 255, 0.9)');

          o.globalAlpha = alpha;
          const sgGrad = o.createRadialGradient(sx, sy, 0, sx, sy, isBright ? 2 : 1.2);
          sgGrad.addColorStop(0, color);
          sgGrad.addColorStop(1, 'rgba(0,0,0,0)');
          o.fillStyle = sgGrad;
          o.beginPath(); o.arc(sx, sy, isBright ? 2 : 1.2, 0, Math.PI * 2); o.fill();
        }
      }
      o.globalAlpha = 1;

      galaxyTexRef.current = off;
    };
    buildNebulaTexture();

    const handleMouse = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX / w, y: e.clientY / h };
    };
    window.addEventListener('mousemove', handleMouse, { passive: true });

    const animate = (time: number) => {
      // Skip rendering when page is hidden — save CPU/GPU
      if (document.hidden) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }
      const stars = starsRef.current;
      const shootingStars = shootingStarsRef.current;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      ctx.clearRect(0, 0, w, h);

      // ═══════════════════════════════════════════
      // CARINA NEBULA — pre-rendered texture, gentle sway
      // ═══════════════════════════════════════════
      {
        const tex = galaxyTexRef.current;
        const { gx, gy, gR } = galaxyDims.current;
        if (tex && gR > 0) {
          const texSize = tex.width;
          const breathe = 1 + 0.05 * Math.sin(time * 0.00015);
          // Very subtle sway (not rotation — nebulae don't rotate)
          const swayX = Math.sin(time * 0.00008) * gR * 0.015;
          const swayY = Math.cos(time * 0.0001) * gR * 0.01;

          ctx.save();
          ctx.globalAlpha = breathe * 0.9;
          ctx.drawImage(
            tex,
            gx - texSize / 2 + swayX,
            gy - texSize / 2 + swayY,
            texSize, texSize
          );
          ctx.restore();
        }
      }

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
      galaxyTexRef.current = null;
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
