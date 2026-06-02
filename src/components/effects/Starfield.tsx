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
  const galaxyWorkerRef = useRef<Worker | null>(null);
  const galaxyArmCache = useRef<{ key: string; points: { x: number; y: number }[][] } | null>(null);

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

    // Spawn galaxy computation worker
    try {
      const worker = new Worker(
        new URL('../../workers/galaxy-worker.ts', import.meta.url),
        { type: 'module' }
      );
      worker.onmessage = (e) => {
        if (e.data.type === 'armPoints') {
          galaxyArmCache.current = {
            key: 'computed',
            points: e.data.points,
          };
        }
      };
      galaxyWorkerRef.current = worker;
    } catch {
      // Worker not available — fallback to main thread computation (already handled)
    }

    // Send initial galaxy config to worker
    const sendGalaxyConfig = () => {
      const worker = galaxyWorkerRef.current;
      if (!worker) return;
      worker.postMessage({
        type: 'config',
        config: {
          gx: w * 0.35,
          gy: h * 0.48,
          gR: Math.min(w, h) * 0.32,
          armCount: 4,
          armTurns: 2.2,
          armSegments: 280,
          galaxyRotation: 0,
        },
      });
    };
    sendGalaxyConfig();

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

      // ═══════════════════════════════════════════════════════
      // SPIRAL GALAXY v2 — majestic background galaxy with
      // dust lanes, core flare, globular clusters, rotation
      // ═══════════════════════════════════════════════════════
      {
        const gx = w * 0.35;
        const gy = h * 0.48;
        const gR = Math.min(w, h) * 0.32;
        const breathe = 1 + 0.06 * Math.sin(time * 0.00015);
        const galaxyRotation = time * 0.00004; // ultra-slow galaxy rotation

        // -- Outer halo: very large, very faint --
        const haloGrad = ctx.createRadialGradient(gx, gy, gR * 0.3, gx, gy, gR * 2.0);
        haloGrad.addColorStop(0, 'rgba(50, 15, 120, 0)');
        haloGrad.addColorStop(0.15, 'rgba(70, 25, 150, 0.025)');
        haloGrad.addColorStop(0.4, 'rgba(35, 12, 90, 0.04)');
        haloGrad.addColorStop(0.7, 'rgba(15, 5, 50, 0.02)');
        haloGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = haloGrad;
        ctx.beginPath();
        ctx.ellipse(gx, gy, gR * 2.0, gR * 1.2, -0.3, 0, Math.PI * 2);
        ctx.fill();

        // -- Core: multi-layer bright center --
        // Inner core (hottest, whitest)
        const coreInner = ctx.createRadialGradient(gx, gy, 0, gx, gy, gR * 0.06);
        coreInner.addColorStop(0, `rgba(255, 250, 240, ${0.14 * breathe})`);
        coreInner.addColorStop(0.5, `rgba(255, 230, 180, ${0.06 * breathe})`);
        coreInner.addColorStop(1, 'rgba(200, 150, 220, 0)');
        ctx.fillStyle = coreInner;
        ctx.beginPath();
        ctx.ellipse(gx, gy, gR * 0.06, gR * 0.045, -0.3, 0, Math.PI * 2);
        ctx.fill();

        // Mid core (warm glow)
        const coreMid = ctx.createRadialGradient(gx, gy, gR * 0.04, gx, gy, gR * 0.22);
        coreMid.addColorStop(0, 'rgba(255, 220, 140, 0)');
        coreMid.addColorStop(0.15, `rgba(240, 180, 100, ${0.07 * breathe})`);
        coreMid.addColorStop(0.45, `rgba(180, 100, 180, ${0.04 * breathe})`);
        coreMid.addColorStop(0.75, `rgba(70, 25, 130, ${0.012 * breathe})`);
        coreMid.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = coreMid;
        ctx.beginPath();
        ctx.ellipse(gx, gy, gR * 0.22, gR * 0.16, -0.3, 0, Math.PI * 2);
        ctx.fill();

        // -- Core cross flare (4-point lens flare) --
        ctx.save();
        ctx.globalAlpha = 0.04 * breathe;
        ctx.translate(gx, gy);
        ctx.rotate(-0.3);
        const flareLen = gR * 0.45;
        for (let f = 0; f < 4; f++) {
          const fa = (f / 4) * Math.PI * 2;
          const flareGrad = ctx.createLinearGradient(0, 0,
            Math.cos(fa) * flareLen, Math.sin(fa) * flareLen * 0.7);
          flareGrad.addColorStop(0, 'rgba(255, 250, 240, 0.6)');
          flareGrad.addColorStop(0.02, 'rgba(200, 180, 240, 0.3)');
          flareGrad.addColorStop(0.15, 'rgba(120, 80, 200, 0.06)');
          flareGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = flareGrad;
          ctx.beginPath();
          ctx.moveTo(
            Math.cos(fa - 0.06) * gR * 0.02,
            Math.sin(fa - 0.06) * gR * 0.02
          );
          ctx.lineTo(
            Math.cos(fa) * flareLen,
            Math.sin(fa) * flareLen * 0.7
          );
          ctx.lineTo(
            Math.cos(fa + 0.06) * gR * 0.02,
            Math.sin(fa + 0.06) * gR * 0.02
          );
          ctx.fill();
        }
        ctx.restore();

        // -- Spiral arms: 4 majestic arms, 2.2 turns --
        // Use worker-computed points when available, fallback to inline calculation
        const armCount = 4;
        const armTurns = 2.2;
        const armSegments = 280;
        const armColors = [
          { r: 100, g: 150, b: 240 },
          { r: 180, g: 110, b: 230 },
          { r: 80, g: 170, b: 250 },
          { r: 190, g: 140, b: 220 },
        ];

        const cachedArms = galaxyArmCache.current?.points;
        const allArmPoints: { x: number; y: number }[][] = cachedArms ?? [];

        if (!cachedArms) {
          // Fallback: compute inline if worker not available
          for (let a = 0; a < armCount; a++) {
            const baseAngle = (a / armCount) * Math.PI * 2 + 0.5 + galaxyRotation;
            const pts: { x: number; y: number }[] = [];
            for (let i = 0; i <= armSegments; i++) {
              const t = i / armSegments;
              const theta = baseAngle + t * armTurns * Math.PI * 2;
              const r = gR * (0.04 + t * 0.76);
              pts.push({ x: gx + Math.cos(theta) * r, y: gy + Math.sin(theta) * r * 0.58 });
            }
            allArmPoints.push(pts);
          }
        }

        // -- Dust lanes: dark paths between arms (rendered first, behind arms) --
        for (let dl = 0; dl < armCount; dl++) {
          const dustAngle = ((dl + 0.5) / armCount) * Math.PI * 2 + 0.5 + galaxyRotation;
          ctx.save();
          ctx.globalAlpha = 0.04 * breathe;
          for (let i = 80; i < armSegments - 30; i++) {
            const t = i / armSegments;
            const theta = dustAngle + t * armTurns * Math.PI * 2;
            const r = gR * (0.08 + t * 0.7);
            const dx = gx + Math.cos(theta) * r;
            const dy = gy + Math.sin(theta) * r * 0.58;
            const dw = gR * 0.025 * (1 - t * 0.5);

            ctx.beginPath();
            ctx.arc(dx, dy, dw, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(4, 2, 12, 0.5)';
            ctx.fill();
          }
          ctx.restore();
        }

        // -- Draw spiral arms --
        for (let a = 0; a < armCount; a++) {
          const pts = allArmPoints[a];
          const clr = armColors[a];

          // Main thick arm
          ctx.save();
          ctx.globalAlpha = breathe;
          for (let i = 1; i < pts.length; i++) {
            const prog = i / pts.length;
            const width = gR * 0.045 * (1 - prog * 0.72);
            const alpha = (0.08 * breathe) * (1 - prog * 0.8);

            ctx.beginPath();
            ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
            ctx.lineTo(pts[i].x, pts[i].y);
            ctx.strokeStyle = `rgba(${clr.r}, ${clr.g}, ${clr.b}, ${alpha})`;
            ctx.lineWidth = width;
            ctx.lineCap = 'round';
            ctx.stroke();
          }

          // Bright inner trace (hot young stars along arm spine)
          for (let i = 1; i < pts.length; i++) {
            const prog = i / pts.length;
            if (prog > 0.5) break;
            const alpha = 0.06 * (1 - prog / 0.5);

            ctx.beginPath();
            ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
            ctx.lineTo(pts[i].x, pts[i].y);
            ctx.strokeStyle = `rgba(230, 210, 255, ${alpha})`;
            ctx.lineWidth = gR * 0.012;
            ctx.lineCap = 'round';
            ctx.stroke();
          }
          ctx.restore();
        }

        // -- Arm star clusters (hot blue + warm gold mix along arms) --
        for (let p = 0; p < 280; p++) {
          const armIdx = p % armCount;
          const pts = allArmPoints[armIdx];
          const t = 0.02 + Math.random() * 0.75;
          const segIdx = Math.floor(t * pts.length);
          const pt = pts[Math.min(segIdx, pts.length - 1)];
          if (!pt) continue;

          const scatterX = (Math.random() - 0.5) * gR * 0.07;
          const scatterY = (Math.random() - 0.5) * gR * 0.035;
          const px = pt.x + scatterX;
          const py = pt.y + scatterY;
          const pAlpha = (0.015 + Math.random() * 0.05) * breathe;
          const pSize = 0.35 + Math.random() * 1.6;
          const isHot = Math.random() > 0.55;

          ctx.globalAlpha = pAlpha;
          ctx.fillStyle = isHot
            ? 'rgba(180, 210, 255, 0.95)'   // hot blue-white
            : 'rgba(255, 235, 195, 0.85)';  // warm gold
          ctx.beginPath();
          ctx.arc(px, py, pSize, 0, Math.PI * 2);
          ctx.fill();

          // Bright stars get a tiny glow
          if (pSize > 1.1 && isHot) {
            const glowGrad = ctx.createRadialGradient(px, py, 0, px, py, pSize * 2.5);
            glowGrad.addColorStop(0, 'rgba(200, 230, 255, 0.3)');
            glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = glowGrad;
            ctx.beginPath();
            ctx.arc(px, py, pSize * 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // -- Core star cluster --
        for (let p = 0; p < 120; p++) {
          const angle = Math.random() * Math.PI * 2;
          const dist = Math.random() * gR * 0.18;
          const cx = gx + Math.cos(angle) * dist;
          const cy = gy + Math.sin(angle) * dist * 0.7;
          const cAlpha = (0.03 + Math.random() * 0.09) * (1 - dist / (gR * 0.18)) * breathe;

          ctx.globalAlpha = cAlpha;
          ctx.fillStyle = dist < gR * 0.04
            ? 'rgba(255, 252, 245, 0.95)'   // very center: pure white
            : 'rgba(255, 240, 210, 0.8)';    // outer core: warm
          ctx.beginPath();
          ctx.arc(cx, cy, 0.4 + Math.random() * 1.8, 0, Math.PI * 2);
          ctx.fill();
        }

        // -- Globular clusters (satellite clusters around galaxy) --
        const globulars = [
          { angle: 1.2, dist: 1.15, size: 0.035 },
          { angle: 3.8, dist: 1.25, size: 0.028 },
          { angle: 5.5, dist: 1.05, size: 0.032 },
        ];
        for (const gc of globulars) {
          const gcx = gx + Math.cos(gc.angle) * gR * gc.dist;
          const gcy = gy + Math.sin(gc.angle) * gR * gc.dist * 0.7;
          const gcR = gR * gc.size;

          // Cluster glow
          const gcGrad = ctx.createRadialGradient(gcx, gcy, 0, gcx, gcy, gcR * 3);
          gcGrad.addColorStop(0, `rgba(180, 160, 220, ${0.04 * breathe})`);
          gcGrad.addColorStop(0.4, `rgba(140, 100, 200, ${0.02 * breathe})`);
          gcGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = gcGrad;
          ctx.beginPath();
          ctx.arc(gcx, gcy, gcR * 3, 0, Math.PI * 2);
          ctx.fill();

          // Cluster stars
          for (let s = 0; s < 35; s++) {
            const sr = Math.random() * gcR;
            const sa = Math.random() * Math.PI * 2;
            const sx = gcx + Math.cos(sa) * sr;
            const sy = gcy + Math.sin(sa) * sr * 0.7;
            ctx.globalAlpha = (0.02 + Math.random() * 0.04) * breathe;
            ctx.fillStyle = 'rgba(200, 220, 255, 0.8)';
            ctx.beginPath();
            ctx.arc(sx, sy, 0.3 + Math.random() * 1.0, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // -- Faint bar structure (many spiral galaxies have a central bar) --
        ctx.save();
        ctx.globalAlpha = 0.025 * breathe;
        ctx.translate(gx, gy);
        ctx.rotate(-0.3 + galaxyRotation * 0.5);
        const barGrad = ctx.createLinearGradient(-gR * 0.18, 0, gR * 0.18, 0);
        barGrad.addColorStop(0, 'rgba(180, 140, 220, 0)');
        barGrad.addColorStop(0.3, 'rgba(200, 160, 230, 0.5)');
        barGrad.addColorStop(0.5, 'rgba(220, 190, 240, 0.6)');
        barGrad.addColorStop(0.7, 'rgba(200, 160, 230, 0.5)');
        barGrad.addColorStop(1, 'rgba(180, 140, 220, 0)');
        ctx.fillStyle = barGrad;
        ctx.fillRect(-gR * 0.18, -gR * 0.018, gR * 0.36, gR * 0.036);
        ctx.restore();

        ctx.globalAlpha = 1;
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
      // Terminate worker to free memory
      galaxyWorkerRef.current?.terminate();
      galaxyWorkerRef.current = null;
      galaxyArmCache.current = null;
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
