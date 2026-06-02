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
  vx: number;
  vy: number;
  captured: boolean;
  fallAngle: number;
  fallSpeed: number;
  fallR: number;
}

interface FGStar { x: number; y: number; r: number; opacity: number; hue: number; }

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  trail: { x: number; y: number }[];
}

interface QuantumFlash {
  x: number;
  y: number;
  born: number;
  maxLife: number;
  size: number;
  hue: number;
}

const STAR_COUNTS = [160, 90, 45];
const STAR_SPEEDS = [0.06, 0.15, 0.30];
const SHOOTING_STAR_INTERVAL = 2500;
const FG_STAR_COUNT = 28;

// Low-perf mode reductions
const STAR_COUNTS_LOW = [60, 35, 18];
const FG_STAR_COUNT_LOW = 10;
const SHOOTING_STAR_INTERVAL_LOW = 6000;

export function Starfield({ perfMode }: { perfMode?: 'low' | 'normal' }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const shootingStarsRef = useRef<ShootingStar[]>([]);
  const quantumFlashesRef = useRef<QuantumFlash[]>([]);
  const rafRef = useRef<number>(0);
  const lastShootingStarRef = useRef(0);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const isLowPerf = perfMode === 'low';
  // Offscreen Carina Nebula texture
  const galaxyTexRef = useRef<HTMLCanvasElement | null>(null);
  const galaxyDims = useRef({ gx: 0, gy: 0, gR: 0 });
  // Second offscreen nebula — deep purple cosmic cloud
  const nebula2TexRef = useRef<HTMLCanvasElement | null>(null);
  const nebula2Dims = useRef({ gx: 0, gy: 0, gR: 0 });
  // Third offscreen nebula — electric blue cosmic cloud
  const nebula3TexRef = useRef<HTMLCanvasElement | null>(null);
  const nebula3Dims = useRef({ gx: 0, gy: 0, gR: 0 });
  // Fourth offscreen nebula — emerald green / teal cosmic cloud
  const nebula4TexRef = useRef<HTMLCanvasElement | null>(null);
  const nebula4Dims = useRef({ gx: 0, gy: 0, gR: 0 });
  // Spiral galaxy — Andromeda analog
  const spiralGalaxyTexRef = useRef<HTMLCanvasElement | null>(null);
  const spiralGalaxyDims = useRef({ gx: 0, gy: 0, gR: 0 });
  const fgStarsRef = useRef<FGStar[]>([]);

  const initFGStars = useCallback((w: number, h: number) => {
    const fg: FGStar[] = [];
    const count = isLowPerf ? FG_STAR_COUNT_LOW : FG_STAR_COUNT;
    for (let i = 0; i < count; i++) {
      const zone = i % 6;
      const zones = [
        { x: 0.05, xr: 0.35, y: 0.02, yr: 0.28 },
        { x: 0.45, xr: 0.30, y: 0.08, yr: 0.30 },
        { x: 0.65, xr: 0.25, y: 0.45, yr: 0.35 },
        { x: 0.10, xr: 0.25, y: 0.50, yr: 0.35 },
        { x: 0.72, xr: 0.20, y: 0.10, yr: 0.25 },
        { x: 0.25, xr: 0.30, y: 0.65, yr: 0.30 },
      ];
      const z = zones[zone];
      fg.push({
        x: (z.x + Math.random() * z.xr) * w,
        y: (z.y + Math.random() * z.yr) * h,
        r: 10 + Math.random() * 32,  // larger bloom radius
        opacity: 0.06 + Math.random() * 0.10, // brighter bloom
        hue: Math.random() > 0.4 ? 30 + Math.random() * 25 : 210 + Math.random() * 140,
      });
    }
    fgStarsRef.current = fg;
  }, []);

  const initStars = useCallback((w: number, h: number) => {
    const counts = isLowPerf ? STAR_COUNTS_LOW : STAR_COUNTS;
    const stars: Star[] = [];
    counts.forEach((count, layer) => {
      for (let i = 0; i < count; i++) {
        const sx = Math.random() * w;
        const sy = Math.random() * h;
        // Black hole position (same as BlackHole.tsx: 78%, 35%)
        const bhx = w * 0.78;
        const bhy = h * 0.35;
        const bhR = Math.min(w, h) * 0.22;
        const dx = sx - bhx;
        const dy = sy - bhy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        stars.push({
          x: sx,
          y: sy,
          r: layer === 0 ? 0.3 + Math.random() * 0.7 : layer === 1 ? 0.6 + Math.random() * 1.2 : 0.9 + Math.random() * 1.6,
          opacity: 0.2 + Math.random() * 0.8,
          twinkleSpeed: 0.003 + Math.random() * 0.025,
          twinklePhase: Math.random() * Math.PI * 2,
          layer,
          hue: 200 + Math.random() * 150,
          vx: 0,
          vy: 0,
          captured: dist < bhR * 2.5,
          fallAngle: Math.atan2(dy, dx),
          fallSpeed: dist < bhR * 1.5 ? 0.3 + Math.random() * 0.6 : 0,
          fallR: dist,
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
      initFGStars(w, h);
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

    /** Build a second deep-space nebula — rich purple + cyan cosmic cloud */
    const buildNebula2Texture = () => {
      const gx = w * 0.58;
      const gy = h * 0.22;
      const gR = Math.min(w, h) * 0.24;
      nebula2Dims.current = { gx, gy, gR };

      const size = Math.ceil(gR * 2.8);
      const off = document.createElement('canvas');
      off.width = size;
      off.height = size;
      const o = off.getContext('2d')!;
      const cx = size / 2;
      const cy = size / 2;

      // Outer halo
      const outerGlow = o.createRadialGradient(cx, cy, gR * 0.2, cx, cy, gR * 1.3);
      outerGlow.addColorStop(0, 'rgba(40, 20, 120, 0.02)');
      outerGlow.addColorStop(0.3, 'rgba(80, 40, 180, 0.06)');
      outerGlow.addColorStop(0.6, 'rgba(30, 15, 90, 0.04)');
      outerGlow.addColorStop(1, 'rgba(0,0,0,0)');
      o.fillStyle = outerGlow;
      o.arc(cx, cy, gR * 1.3, 0, Math.PI * 2);
      o.fill();

      // Purple gas blobs
      const purpleBlobs = [
        { x: -0.1, y: -0.05, r: 0.6, a: 0.07 },
        { x: 0.15, y: -0.1, r: 0.5, a: 0.055 },
        { x: -0.2, y: 0.15, r: 0.45, a: 0.045 },
        { x: 0.1, y: 0.12, r: 0.4, a: 0.04 },
        { x: -0.05, y: 0.25, r: 0.35, a: 0.03 },
        { x: 0.25, y: -0.15, r: 0.38, a: 0.035 },
        { x: -0.25, y: -0.2, r: 0.32, a: 0.028 },
      ];
      for (const gb of purpleBlobs) {
        const bx = cx + gb.x * gR;
        const by = cy + gb.y * gR;
        const br = gb.r * gR;
        const grad = o.createRadialGradient(bx, by, 0, bx, by, br);
        grad.addColorStop(0, `rgba(140, 60, 240, ${gb.a})`);
        grad.addColorStop(0.3, `rgba(120, 50, 200, ${gb.a * 0.7})`);
        grad.addColorStop(0.6, `rgba(80, 30, 150, ${gb.a * 0.3})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        o.fillStyle = grad;
        o.beginPath(); o.arc(bx, by, br, 0, Math.PI * 2); o.fill();
      }

      // Cyan accent blobs
      const cyanBlobs = [
        { x: 0.2, y: -0.2, r: 0.25, a: 0.025 },
        { x: -0.3, y: -0.05, r: 0.22, a: 0.02 },
        { x: 0.15, y: 0.2, r: 0.2, a: 0.018 },
      ];
      for (const cb of cyanBlobs) {
        const bx = cx + cb.x * gR;
        const by = cy + cb.y * gR;
        const br = cb.r * gR;
        const bGrad = o.createRadialGradient(bx, by, 0, bx, by, br);
        bGrad.addColorStop(0, `rgba(100, 200, 250, ${cb.a * 1.2})`);
        bGrad.addColorStop(0.4, `rgba(80, 170, 230, ${cb.a * 0.7})`);
        bGrad.addColorStop(1, 'rgba(0,0,0,0)');
        o.fillStyle = bGrad;
        o.beginPath(); o.arc(bx, by, br, 0, Math.PI * 2); o.fill();
      }

      // Bright central star
      const centerGrad = o.createRadialGradient(cx, cy - gR * 0.03, 0, cx, cy - gR * 0.03, gR * 0.1);
      centerGrad.addColorStop(0, 'rgba(220, 200, 255, 0.35)');
      centerGrad.addColorStop(0.1, 'rgba(180, 150, 240, 0.15)');
      centerGrad.addColorStop(0.4, 'rgba(100, 60, 180, 0.04)');
      centerGrad.addColorStop(1, 'rgba(0,0,0,0)');
      o.fillStyle = centerGrad;
      o.beginPath(); o.arc(cx, cy - gR * 0.03, gR * 0.1, 0, Math.PI * 2); o.fill();

      // Diffraction spikes
      o.save();
      o.translate(cx, cy - gR * 0.03);
      o.globalAlpha = 0.1;
      for (let s = 0; s < 4; s++) {
        const sa = (s / 4) * Math.PI * 2 + 0.3;
        const sLen = gR * 0.07;
        const sg = o.createLinearGradient(0, 0, Math.cos(sa) * sLen, Math.sin(sa) * sLen);
        sg.addColorStop(0, 'rgba(255, 240, 255, 0.5)');
        sg.addColorStop(1, 'rgba(0,0,0,0)');
        o.fillStyle = sg;
        o.beginPath();
        o.moveTo(Math.cos(sa - 0.06) * gR * 0.005, Math.sin(sa - 0.06) * gR * 0.005);
        o.lineTo(Math.cos(sa) * sLen, Math.sin(sa) * sLen);
        o.lineTo(Math.cos(sa + 0.06) * gR * 0.005, Math.sin(sa + 0.06) * gR * 0.005);
        o.fill();
      }
      o.restore();

      // Wisps
      for (let w = 0; w < 35; w++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = gR * (0.05 + Math.random() * 0.6);
        const wx = cx + Math.cos(angle) * dist;
        const wy = cy + Math.sin(angle) * dist;
        const wLen = gR * (0.03 + Math.random() * 0.1);
        o.save();
        o.translate(wx, wy);
        o.rotate(angle + (Math.random() - 0.5) * 1);
        const wGrad = o.createLinearGradient(0, 0, wLen, 0);
        const wAlpha = 0.005 + Math.random() * 0.015;
        wGrad.addColorStop(0, `rgba(200, 160, 240, ${wAlpha})`);
        wGrad.addColorStop(1, 'rgba(0,0,0,0)');
        o.fillStyle = wGrad;
        o.fillRect(0, -0.6, wLen, 1.2);
        o.restore();
      }

      o.globalAlpha = 1;
      nebula2TexRef.current = off;
    };
    buildNebula2Texture();

    /** Build third nebula — electric blue cosmic cloud */
    const buildNebula3Texture = () => {
      const gx = w * 0.15;
      const gy = h * 0.68;
      const gR = Math.min(w, h) * 0.20;
      nebula3Dims.current = { gx, gy, gR };

      const size = Math.ceil(gR * 2.6);
      const off = document.createElement('canvas');
      off.width = size;
      off.height = size;
      const o = off.getContext('2d')!;
      const cx = size / 2;
      const cy = size / 2;

      // Outer halo
      const outer = o.createRadialGradient(cx, cy, gR * 0.15, cx, cy, gR * 1.2);
      outer.addColorStop(0, 'rgba(20, 60, 180, 0.03)');
      outer.addColorStop(0.3, 'rgba(40, 100, 200, 0.07)');
      outer.addColorStop(0.6, 'rgba(15, 50, 140, 0.04)');
      outer.addColorStop(1, 'rgba(0,0,0,0)');
      o.fillStyle = outer;
      o.arc(cx, cy, gR * 1.2, 0, Math.PI * 2);
      o.fill();

      // Blue emission blobs
      const blueBlobs = [
        { x: -0.08, y: -0.05, r: 0.55, a: 0.06 },
        { x: 0.12, y: -0.1, r: 0.48, a: 0.05 },
        { x: -0.15, y: 0.12, r: 0.42, a: 0.04 },
        { x: 0.08, y: 0.15, r: 0.38, a: 0.035 },
        { x: -0.02, y: 0.22, r: 0.32, a: 0.028 },
        { x: 0.2, y: -0.15, r: 0.35, a: 0.03 },
      ];
      for (const gb of blueBlobs) {
        const bx = cx + gb.x * gR;
        const by = cy + gb.y * gR;
        const br = gb.r * gR;
        const grad = o.createRadialGradient(bx, by, 0, bx, by, br);
        grad.addColorStop(0, `rgba(60, 140, 255, ${gb.a})`);
        grad.addColorStop(0.3, `rgba(40, 120, 230, ${gb.a * 0.7})`);
        grad.addColorStop(0.6, `rgba(25, 80, 200, ${gb.a * 0.3})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        o.fillStyle = grad;
        o.beginPath(); o.arc(bx, by, br, 0, Math.PI * 2); o.fill();
      }

      // White-blue reflection spots
      const whiteBlobs = [
        { x: -0.1, y: -0.15, r: 0.2, a: 0.025 },
        { x: 0.15, y: 0.05, r: 0.18, a: 0.02 },
      ];
      for (const wb of whiteBlobs) {
        const bx = cx + wb.x * gR;
        const by = cy + wb.y * gR;
        const br = wb.r * gR;
        const wGrad = o.createRadialGradient(bx, by, 0, bx, by, br);
        wGrad.addColorStop(0, `rgba(180, 210, 255, ${wb.a * 1.3})`);
        wGrad.addColorStop(0.4, `rgba(150, 190, 240, ${wb.a * 0.7})`);
        wGrad.addColorStop(1, 'rgba(0,0,0,0)');
        o.fillStyle = wGrad;
        o.beginPath(); o.arc(bx, by, br, 0, Math.PI * 2); o.fill();
      }

      // Bright center star
      const centerGrad = o.createRadialGradient(cx, cy - gR * 0.02, 0, cx, cy - gR * 0.02, gR * 0.08);
      centerGrad.addColorStop(0, 'rgba(230, 240, 255, 0.35)');
      centerGrad.addColorStop(0.15, 'rgba(180, 210, 250, 0.15)');
      centerGrad.addColorStop(0.45, 'rgba(80, 140, 220, 0.04)');
      centerGrad.addColorStop(1, 'rgba(0,0,0,0)');
      o.fillStyle = centerGrad;
      o.beginPath(); o.arc(cx, cy - gR * 0.02, gR * 0.08, 0, Math.PI * 2); o.fill();

      // Diffraction
      o.save();
      o.translate(cx, cy - gR * 0.02);
      o.globalAlpha = 0.08;
      for (let s = 0; s < 4; s++) {
        const sa = (s / 4) * Math.PI * 2 + 0.5;
        const sLen = gR * 0.06;
        const sg = o.createLinearGradient(0, 0, Math.cos(sa) * sLen, Math.sin(sa) * sLen);
        sg.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
        sg.addColorStop(1, 'rgba(0,0,0,0)');
        o.fillStyle = sg;
        o.beginPath();
        o.moveTo(Math.cos(sa - 0.05) * gR * 0.004, Math.sin(sa - 0.05) * gR * 0.004);
        o.lineTo(Math.cos(sa) * sLen, Math.sin(sa) * sLen);
        o.lineTo(Math.cos(sa + 0.05) * gR * 0.004, Math.sin(sa + 0.05) * gR * 0.004);
        o.fill();
      }
      o.restore();

      // Wisps
      for (let w = 0; w < 30; w++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = gR * (0.05 + Math.random() * 0.55);
        const wx = cx + Math.cos(angle) * dist;
        const wy = cy + Math.sin(angle) * dist;
        const wLen = gR * (0.03 + Math.random() * 0.08);
        o.save();
        o.translate(wx, wy);
        o.rotate(angle + (Math.random() - 0.5) * 1);
        const wGrad = o.createLinearGradient(0, 0, wLen, 0);
        const wAlpha = 0.004 + Math.random() * 0.012;
        wGrad.addColorStop(0, `rgba(140, 200, 255, ${wAlpha})`);
        wGrad.addColorStop(1, 'rgba(0,0,0,0)');
        o.fillStyle = wGrad;
        o.fillRect(0, -0.5, wLen, 1);
        o.restore();
      }

      o.globalAlpha = 1;
      nebula3TexRef.current = off;
    };
    buildNebula3Texture();

    /** Build fourth nebula — emerald green / teal cosmic cloud */
    const buildNebula4Texture = () => {
      const gx = w * 0.72;
      const gy = h * 0.75;
      const gR = Math.min(w, h) * 0.18;
      nebula4Dims.current = { gx, gy, gR };

      const size = Math.ceil(gR * 2.6);
      const off = document.createElement('canvas');
      off.width = size;
      off.height = size;
      const o = off.getContext('2d')!;
      const cx = size / 2;
      const cy = size / 2;

      // Outer halo — teal/emerald
      const outer = o.createRadialGradient(cx, cy, gR * 0.1, cx, cy, gR * 1.25);
      outer.addColorStop(0, 'rgba(20, 160, 140, 0.04)');
      outer.addColorStop(0.3, 'rgba(30, 180, 150, 0.06)');
      outer.addColorStop(0.6, 'rgba(15, 120, 100, 0.035)');
      outer.addColorStop(1, 'rgba(0,0,0,0)');
      o.fillStyle = outer;
      o.arc(cx, cy, gR * 1.25, 0, Math.PI * 2);
      o.fill();

      // Emerald green gas blobs
      const greenBlobs = [
        { x: -0.08, y: -0.05, r: 0.55, a: 0.06 },
        { x: 0.12, y: -0.08, r: 0.48, a: 0.05 },
        { x: -0.15, y: 0.1, r: 0.42, a: 0.04 },
        { x: 0.08, y: 0.15, r: 0.38, a: 0.035 },
        { x: -0.03, y: 0.2, r: 0.32, a: 0.028 },
        { x: 0.18, y: -0.12, r: 0.35, a: 0.03 },
      ];
      for (const gb of greenBlobs) {
        const bx = cx + gb.x * gR;
        const by = cy + gb.y * gR;
        const br = gb.r * gR;
        const grad = o.createRadialGradient(bx, by, 0, bx, by, br);
        grad.addColorStop(0, `rgba(40, 180, 130, ${gb.a})`);
        grad.addColorStop(0.3, `rgba(30, 150, 110, ${gb.a * 0.7})`);
        grad.addColorStop(0.6, `rgba(20, 100, 80, ${gb.a * 0.3})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        o.fillStyle = grad;
        o.beginPath(); o.arc(bx, by, br, 0, Math.PI * 2); o.fill();
      }

      // Golden accent spots
      const goldBlobs = [
        { x: -0.12, y: -0.18, r: 0.18, a: 0.025 },
        { x: 0.15, y: 0.05, r: 0.16, a: 0.02 },
      ];
      for (const wb of goldBlobs) {
        const bx = cx + wb.x * gR;
        const by = cy + wb.y * gR;
        const br = wb.r * gR;
        const wGrad = o.createRadialGradient(bx, by, 0, bx, by, br);
        wGrad.addColorStop(0, `rgba(200, 220, 180, ${wb.a * 1.3})`);
        wGrad.addColorStop(0.4, `rgba(160, 200, 140, ${wb.a * 0.7})`);
        wGrad.addColorStop(1, 'rgba(0,0,0,0)');
        o.fillStyle = wGrad;
        o.beginPath(); o.arc(bx, by, br, 0, Math.PI * 2); o.fill();
      }

      // Bright center star
      const centerGrad = o.createRadialGradient(cx, cy - gR * 0.02, 0, cx, cy - gR * 0.02, gR * 0.07);
      centerGrad.addColorStop(0, 'rgba(200, 250, 220, 0.35)');
      centerGrad.addColorStop(0.15, 'rgba(140, 220, 180, 0.15)');
      centerGrad.addColorStop(0.45, 'rgba(60, 160, 120, 0.04)');
      centerGrad.addColorStop(1, 'rgba(0,0,0,0)');
      o.fillStyle = centerGrad;
      o.beginPath(); o.arc(cx, cy - gR * 0.02, gR * 0.07, 0, Math.PI * 2); o.fill();

      // Diffraction
      o.save();
      o.translate(cx, cy - gR * 0.02);
      o.globalAlpha = 0.07;
      for (let s = 0; s < 4; s++) {
        const sa = (s / 4) * Math.PI * 2 + 0.35;
        const sLen = gR * 0.05;
        const sg = o.createLinearGradient(0, 0, Math.cos(sa) * sLen, Math.sin(sa) * sLen);
        sg.addColorStop(0, 'rgba(220, 255, 240, 0.5)');
        sg.addColorStop(1, 'rgba(0,0,0,0)');
        o.fillStyle = sg;
        o.beginPath();
        o.moveTo(Math.cos(sa - 0.05) * gR * 0.004, Math.sin(sa - 0.05) * gR * 0.004);
        o.lineTo(Math.cos(sa) * sLen, Math.sin(sa) * sLen);
        o.lineTo(Math.cos(sa + 0.05) * gR * 0.004, Math.sin(sa + 0.05) * gR * 0.004);
        o.fill();
      }
      o.restore();

      // Wisps
      for (let w = 0; w < 25; w++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = gR * (0.05 + Math.random() * 0.5);
        const wx = cx + Math.cos(angle) * dist;
        const wy = cy + Math.sin(angle) * dist;
        const wLen = gR * (0.03 + Math.random() * 0.07);
        o.save();
        o.translate(wx, wy);
        o.rotate(angle + (Math.random() - 0.5) * 1);
        const wGrad = o.createLinearGradient(0, 0, wLen, 0);
        const wAlpha = 0.004 + Math.random() * 0.01;
        wGrad.addColorStop(0, `rgba(80, 200, 150, ${wAlpha})`);
        wGrad.addColorStop(1, 'rgba(0,0,0,0)');
        o.fillStyle = wGrad;
        o.fillRect(0, -0.5, wLen, 1);
        o.restore();
      }

      o.globalAlpha = 1;
      nebula4TexRef.current = off;
    };
    buildNebula4Texture();

    /** Build spiral galaxy — Andromeda analog */
    const buildSpiralGalaxy = () => {
      const gx = w * 0.48;
      const gy = h * 0.82;
      const gR = Math.min(w, h) * 0.25;
      spiralGalaxyDims.current = { gx, gy, gR };

      const size = Math.ceil(gR * 3);
      const off = document.createElement('canvas');
      off.width = size;
      off.height = size;
      const o = off.getContext('2d')!;
      const cx = size / 2;
      const cy = size / 2;

      // Outer halo — warm elliptical glow
      const haloGrad = o.createRadialGradient(cx, cy, gR * 0.45, cx, cy, gR * 1.4);
      haloGrad.addColorStop(0, 'rgba(180, 160, 100, 0.03)');
      haloGrad.addColorStop(0.35, 'rgba(140, 120, 80, 0.05)');
      haloGrad.addColorStop(0.65, 'rgba(100, 80, 50, 0.03)');
      haloGrad.addColorStop(1, 'rgba(0,0,0,0)');
      o.fillStyle = haloGrad;
      o.beginPath(); o.ellipse(cx, cy, gR * 1.4, gR * 0.65, -0.3, 0, Math.PI * 2); o.fill();

      // Central bulge — bright core
      const bulgeGrad = o.createRadialGradient(cx, cy, 0, cx, cy, gR * 0.4);
      bulgeGrad.addColorStop(0, 'rgba(255, 240, 200, 0.15)');
      bulgeGrad.addColorStop(0.15, 'rgba(240, 210, 160, 0.08)');
      bulgeGrad.addColorStop(0.4, 'rgba(200, 170, 120, 0.03)');
      bulgeGrad.addColorStop(0.7, 'rgba(140, 100, 60, 0.01)');
      bulgeGrad.addColorStop(1, 'rgba(0,0,0,0)');
      o.fillStyle = bulgeGrad;
      o.beginPath(); o.arc(cx, cy, gR * 0.4, 0, Math.PI * 2); o.fill();

      // Core bright point
      const coreGrad = o.createRadialGradient(cx, cy, 0, cx, cy, gR * 0.08);
      coreGrad.addColorStop(0, 'rgba(255, 250, 235, 0.25)');
      coreGrad.addColorStop(0.3, 'rgba(230, 210, 170, 0.1)');
      coreGrad.addColorStop(0.7, 'rgba(180, 150, 100, 0.02)');
      coreGrad.addColorStop(1, 'rgba(0,0,0,0)');
      o.fillStyle = coreGrad;
      o.beginPath(); o.arc(cx, cy, gR * 0.08, 0, Math.PI * 2); o.fill();

      // Spiral arms — logarithmic spiral
      const numArms = 4;
      const totalSteps = 280;
      const rotation = -0.35; // tilt angle
      for (let arm = 0; arm < numArms; arm++) {
        const armOffset = (arm / numArms) * Math.PI * 2;
        o.save();
        o.translate(cx, cy);
        o.rotate(rotation);

        for (let step = 0; step < totalSteps; step++) {
          const t = step / totalSteps;
          const r = gR * (0.04 + t * 0.85); // distance from center
          const angle = armOffset + t * Math.PI * 2.3; // logarithmic wind
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r * 0.35; // flatten to create disk perspective

          // Arm gets thinner and fades with distance
          const armWidth = gR * 0.03 * (1 - t * 0.7);
          const alpha = 0.04 * (1 - t * 0.8) * (0.5 + 0.5 * arm % 2);

          const dotGrad = o.createRadialGradient(x, y, 0, x, y, armWidth);
          // Blueish tint for arms, warmer near core
          const rTint = 140 + t * 60;
          const gTint = 130 + t * 30;
          const bTint = 170 - t * 70;
          dotGrad.addColorStop(0, `rgba(${rTint},${gTint},${bTint},${alpha})`);
          dotGrad.addColorStop(0.5, `rgba(${rTint * 0.7},${gTint * 0.7},${bTint * 0.7},${alpha * 0.4})`);
          dotGrad.addColorStop(1, 'rgba(0,0,0,0)');
          o.fillStyle = dotGrad;
          o.beginPath(); o.arc(x, y, armWidth, 0, Math.PI * 2); o.fill();
        }
        o.restore();
      }

      // Dust lanes between arms (thin dark streaks)
      for (let arm = 0; arm < numArms; arm++) {
        const armOffset = (arm / numArms) * Math.PI * 2 + Math.PI / numArms;
        o.save();
        o.translate(cx, cy);
        o.rotate(rotation);

        for (let step = 0; step < 150; step++) {
          const t = step / 150;
          const r = gR * (0.1 + t * 0.7);
          const angle = armOffset + t * Math.PI * 2.3;
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r * 0.35;

          const dustAlpha = 0.015 * (1 - t);
          o.globalAlpha = dustAlpha;
          o.fillStyle = 'rgba(4, 3, 8, 1)';
          o.beginPath(); o.arc(x, y, gR * 0.015, 0, Math.PI * 2); o.fill();
        }
        o.restore();
      }
      o.globalAlpha = 1;

      // Scattered star dots in disk
      for (let i = 0; i < 200; i++) {
        const r = gR * (0.05 + Math.random() * 0.85);
        const angle = Math.random() * Math.PI * 2;
        o.save();
        o.translate(cx, cy);
        o.rotate(rotation);
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r * 0.35;
        o.restore();

        const dotAlpha = 0.008 + Math.random() * 0.015;
        const starGrad = o.createRadialGradient(cx + x, cy + y, 0, cx + x, cy + y, 1.5);
        starGrad.addColorStop(0, `rgba(220, 210, 180, ${dotAlpha * 2})`);
        starGrad.addColorStop(1, 'rgba(0,0,0,0)');
        o.fillStyle = starGrad;
        o.beginPath(); o.arc(cx + x, cy + y, 1.5, 0, Math.PI * 2); o.fill();
      }

      o.globalAlpha = 1;
      spiralGalaxyTexRef.current = off;
    };
    buildSpiralGalaxy();

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

      // ── Skip premium nebulae in low-perf mode ──
      if (!isLowPerf) {
        // ═══ CARINA NEBULA ═══
        {
        const tex = galaxyTexRef.current;
        const { gx, gy, gR } = galaxyDims.current;
        if (tex && gR > 0) {
          const texSize = tex.width;
          const breathe = 1 + 0.05 * Math.sin(time * 0.00015);
          const swayX = Math.sin(time * 0.00008) * gR * 0.015;
          const swayY = Math.cos(time * 0.0001) * gR * 0.01;

          ctx.save();
          ctx.globalAlpha = breathe * 0.9;
          ctx.drawImage(tex, gx - texSize / 2 + swayX, gy - texSize / 2 + swayY, texSize, texSize);
          ctx.restore();
        }
      }

      // ═══════════════════════════════════════════
      // NEBULA 2 — Deep purple cosmic cloud
      // ═══════════════════════════════════════════
      {
        const tex = nebula2TexRef.current;
        const { gx, gy, gR } = nebula2Dims.current;
        if (tex && gR > 0) {
          const texSize = tex.width;
          const breathe = 1 + 0.08 * Math.sin(time * 0.00018);
          const swayX = Math.sin(time * 0.0001) * gR * 0.02;
          const swayY = Math.cos(time * 0.00007) * gR * 0.015;

          ctx.save();
          ctx.globalAlpha = breathe * 0.8;
          ctx.drawImage(tex, gx - texSize / 2 + swayX, gy - texSize / 2 + swayY, texSize, texSize);
          ctx.restore();
        }
      }

      // ═══════════════════════════════════════════
      // NEBULA 3 — Electric blue cosmic cloud
      // ═══════════════════════════════════════════
      {
        const tex = nebula3TexRef.current;
        const { gx, gy, gR } = nebula3Dims.current;
        if (tex && gR > 0) {
          const texSize = tex.width;
          const breathe = 1 + 0.06 * Math.sin(time * 0.00022);
          const swayX = Math.sin(time * 0.00012) * gR * 0.018;
          const swayY = Math.cos(time * 0.00009) * gR * 0.012;

          ctx.save();
          ctx.globalAlpha = breathe * 0.75;
          ctx.drawImage(tex, gx - texSize / 2 + swayX, gy - texSize / 2 + swayY, texSize, texSize);
          ctx.restore();
        }
      }

      // ═══════════════════════════════════════════
      // NEBULA 4 — Emerald green / teal cosmic cloud
      // ═══════════════════════════════════════════
      {
        const tex = nebula4TexRef.current;
        const { gx, gy, gR } = nebula4Dims.current;
        if (tex && gR > 0) {
          const texSize = tex.width;
          const breathe = 1 + 0.07 * Math.sin(time * 0.00025);
          const swayX = Math.sin(time * 0.00014) * gR * 0.015;
          const swayY = Math.cos(time * 0.00008) * gR * 0.018;

          ctx.save();
          ctx.globalAlpha = breathe * 0.7;
          ctx.drawImage(tex, gx - texSize / 2 + swayX, gy - texSize / 2 + swayY, texSize, texSize);
          ctx.restore();
        }
      }

      // ═══════════════════════════════════════════
      // SPIRAL GALAXY — Andromeda analog
      // ═══════════════════════════════════════════
      {
        const tex = spiralGalaxyTexRef.current;
        const { gx, gy, gR } = spiralGalaxyDims.current;
        if (tex && gR > 0) {
          const texSize = tex.width;
          const breathe = 1 + 0.04 * Math.sin(time * 0.0001);
          const swayX = Math.sin(time * 0.00006) * gR * 0.01;
          const swayY = Math.cos(time * 0.00008) * gR * 0.012;

          ctx.save();
          ctx.globalAlpha = breathe * 0.65;
          ctx.drawImage(tex, gx - texSize / 2 + swayX, gy - texSize / 2 + swayY, texSize, texSize);
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
      } // end if (!isLowPerf)

      // Stars with parallax, hue, and BLACK HOLE GRAVITY
      // Black hole parameters (must match BlackHole.tsx)
      const bhx = w * 0.78;
      const bhy = h * 0.35;
      const bhR = Math.min(w, h) * 0.22;
      const bhEventHorizon = bhR * 0.46;

      for (let i = stars.length - 1; i >= 0; i--) {
        const star = stars[i];
        const parallaxX = (mx - 0.5) * star.layer * 10;
        const parallaxY = (my - 0.5) * star.layer * 10;

        // ── Black hole gravitational interaction ──
        const dx = star.x - bhx;
        const dy = star.y - bhy;
        const distToBH = Math.sqrt(dx * dx + dy * dy);
        const gravityInfluence = bhR * 3.5;

        if (distToBH < gravityInfluence) {
          // Gravity gets stronger closer to black hole
          const gravStrength = 0.0008 * (1 - distToBH / gravityInfluence) * (1 - distToBH / gravityInfluence);
          const angleToBH = Math.atan2(dy, dx);
          star.vx -= Math.cos(angleToBH) * gravStrength;
          star.vy -= Math.sin(angleToBH) * gravStrength;

          // Mark as captured if close enough
          if (distToBH < bhR * 1.8 && !star.captured) {
            star.captured = true;
            star.fallAngle = angleToBH;
            star.fallSpeed = 0.08 + Math.random() * 0.15;
            star.fallR = distToBH;
          }
        }

        // ── Captured stars: spiral into black hole ──
        if (star.captured) {
          star.fallSpeed += 0.00015 * (1 + 1 / Math.max(star.fallR / bhR, 0.1));
          star.fallR -= star.fallSpeed;
          star.fallAngle += 0.015 / Math.max(star.fallR / bhR, 0.1); // tighter spirals
          star.x = bhx + Math.cos(star.fallAngle) * star.fallR;
          star.y = bhy + Math.sin(star.fallAngle) * star.fallR * 0.42;
          star.opacity = Math.max(0, star.opacity - 0.002); // fade as it approaches

          // Annihilated at event horizon
          if (star.fallR < bhEventHorizon || star.opacity <= 0) {
            // Spawn replacement star far from black hole
            const spawnAngle = Math.random() * Math.PI * 2;
            const spawnDist = Math.max(w, h) * 0.6 + Math.random() * Math.max(w, h) * 0.4;
            const spawnX = bhx + Math.cos(spawnAngle) * spawnDist;
            const spawnY = bhy + Math.sin(spawnAngle) * spawnDist;
            // Clamp to canvas
            star.x = Math.max(0, Math.min(w, spawnX));
            star.y = Math.max(0, Math.min(h, spawnY));
            star.vx = 0;
            star.vy = 0;
            star.captured = false;
            star.fallSpeed = 0;
            star.fallR = 0;
            star.opacity = 0.15 + Math.random() * 0.4; // fresh star
            continue;
          }
        } else {
          // Normal star drift (only for non-captured stars)
          star.y += STAR_SPEEDS[star.layer] * (1 + star.vy * 0.1);
          if (star.y > h + 8) { star.y = -8; star.x = Math.random() * w; star.vx = 0; star.vy = 0; }
          if (star.y < -8) star.y = h + 8;
        }

        let sx = star.x + parallaxX;
        let sy = star.y + parallaxY;

        // Twinkle
        star.twinklePhase += star.twinkleSpeed;
        const twinkle = 0.5 + 0.5 * Math.sin(star.twinklePhase);
        const baseOpacity = star.opacity;
        const finalOpacity = baseOpacity * (0.55 + 0.45 * twinkle);

        // ── Render captured stars with redshift ──
        ctx.save();
        ctx.globalAlpha = finalOpacity;

        if (star.captured) {
          // Redshift: hue shifts toward red and gains intensity as it falls
          const proxToBH = 1 - Math.max(0, star.fallR - bhEventHorizon) / (bhR * 1.8);
          const fallHue = star.hue - proxToBH * 60;
          const trailColor = `hsla(${fallHue}, 70%, 70%, 1)`;
          const trailColorMid = `hsla(${fallHue}, 55%, 55%, 0.6)`;

          // Longer trail for captured stars
          const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, star.r * 4);
          gradient.addColorStop(0, trailColor);
          gradient.addColorStop(0.2, trailColorMid);
          gradient.addColorStop(0.6, `hsla(${fallHue}, 40%, 35%, 0.15)`);
          gradient.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(sx, sy, star.r * 4, 0, Math.PI * 2);
          ctx.fill();

          // Core stays bright
          ctx.fillStyle = `hsla(${fallHue}, 15%, 90%, 0.8)`;
          ctx.beginPath();
          ctx.arc(sx, sy, star.r * 0.6, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Normal star rendering
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

          // Diffraction spike on brightest near-layer stars
          if (star.layer === 2 && star.r > 1.2 && star.opacity > 0.7) {
            const spikeAlpha = finalOpacity * 0.35;
            ctx.globalAlpha = spikeAlpha;
            ctx.strokeStyle = `hsla(${star.hue}, 30%, 85%, 1)`;
            ctx.lineWidth = 0.5;
            const spikeLen = star.r * 4;
            for (let d = 0; d < 4; d++) {
              const da = (d / 4) * Math.PI + Math.PI / 4;
              ctx.beginPath();
              ctx.moveTo(sx + Math.cos(da) * star.r, sy + Math.sin(da) * star.r);
              ctx.lineTo(sx + Math.cos(da) * spikeLen, sy + Math.sin(da) * spikeLen);
              ctx.stroke();
            }
          }
        }

        ctx.restore();
      }

      // Foreground "out of focus" cinematic stars — dramatic bloom
      {
        const fgStars = fgStarsRef.current;
        for (let f = 0; f < fgStars.length; f++) {
          const fs = fgStars[f];
          const fpx = (mx - 0.5) * fs.r * 0.5;
          const fpy = (my - 0.5) * fs.r * 0.5;
          const fx = fs.x + fpx;
          const fy = fs.y + fpy;

          const twinkle = 0.5 + 0.5 * Math.sin(time * 0.0005 + f * 0.7);
          const fAlpha = fs.opacity * (0.6 + 0.4 * twinkle);

          // Core glow layer (larger bloom)
          ctx.save();
          ctx.globalAlpha = fAlpha;
          const fGrad = ctx.createRadialGradient(fx, fy, 0, fx, fy, fs.r * 1.5);
          fGrad.addColorStop(0, `hsla(${fs.hue}, 45%, 82%, 0.55)`);
          fGrad.addColorStop(0.08, `hsla(${fs.hue}, 35%, 68%, 0.35)`);
          fGrad.addColorStop(0.25, `hsla(${fs.hue}, 25%, 50%, 0.12)`);
          fGrad.addColorStop(0.55, `hsla(${fs.hue}, 15%, 35%, 0.03)`);
          fGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = fGrad;
          ctx.beginPath();
          ctx.arc(fx, fy, fs.r * 1.5, 0, Math.PI * 2);
          ctx.fill();

          // Inner hot core
          ctx.globalAlpha = fAlpha * 0.7;
          const coreGrad = ctx.createRadialGradient(fx, fy, 0, fx, fy, fs.r * 0.2);
          coreGrad.addColorStop(0, `hsla(${fs.hue}, 20%, 95%, 0.8)`);
          coreGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = coreGrad;
          ctx.beginPath();
          ctx.arc(fx, fy, fs.r * 0.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // Global warm cinematic tint overlay — subtle amber wash
      {
        const tintAlpha = 0.025 + 0.008 * Math.sin(time * 0.0001);
        ctx.save();
        ctx.globalAlpha = tintAlpha;
        const tintGrad = ctx.createRadialGradient(
          w * 0.35, h * 0.45, Math.min(w, h) * 0.15,
          w * 0.35, h * 0.45, Math.max(w, h) * 0.9
        );
        tintGrad.addColorStop(0, 'rgba(255, 180, 80, 0.5)');
        tintGrad.addColorStop(0.35, 'rgba(200, 120, 50, 0.2)');
        tintGrad.addColorStop(0.7, 'rgba(80, 30, 20, 0.05)');
        tintGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = tintGrad;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }

      // ---- Quantum fluctuation flashes — brief virtual particles ----
      {
        const flashes = quantumFlashesRef.current;
        // Spawn
        if (Math.random() < 0.06) {
          flashes.push({
            x: Math.random() * w,
            y: Math.random() * h,
            born: time,
            maxLife: 120 + Math.random() * 250,
            size: 1.5 + Math.random() * 3,
            hue: Math.random() > 0.5 ? 260 + Math.random() * 60 : 170 + Math.random() * 30,
          });
        }
        for (let i = flashes.length - 1; i >= 0; i--) {
          const f = flashes[i];
          const age = time - f.born;
          if (age > f.maxLife) { flashes.splice(i, 1); continue; }
          const t = age / f.maxLife;
          // Quick fade in, then fade out — like a virtual particle popping in/out
          const alpha = t < 0.15 ? t / 0.15 : (1 - t) / 0.85;
          if (alpha < 0.01) continue;
          ctx.save();
          ctx.globalAlpha = alpha * 0.25;
          const fGrad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.size);
          fGrad.addColorStop(0, `hsla(${f.hue}, 70%, 80%, 0.9)`);
          fGrad.addColorStop(0.3, `hsla(${f.hue}, 60%, 65%, 0.4)`);
          fGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = fGrad;
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // ---- Cosmic web filaments — very faint connections between nearby stars ----
      {
        ctx.save();
        ctx.globalAlpha = 0.012;
        ctx.strokeStyle = 'rgba(140, 120, 220, 1)';
        ctx.lineWidth = 0.4;
        const layer2Stars = stars.filter(s => s.layer >= 1 && s.opacity > 0.5);
        const maxDist = Math.min(w, h) * 0.12;
        for (let i = 0; i < layer2Stars.length; i++) {
          const s1 = layer2Stars[i];
          const p1x = s1.x + (mx - 0.5) * s1.layer * 10;
          const p1y = s1.y + (my - 0.5) * s1.layer * 10;
          for (let j = i + 1; j < Math.min(layer2Stars.length, i + 8); j++) {
            const s2 = layer2Stars[j];
            const p2x = s2.x + (mx - 0.5) * s2.layer * 10;
            const p2y = s2.y + (my - 0.5) * s2.layer * 10;
            const dx = p1x - p2x;
            const dy = p1y - p2y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < maxDist) {
              const lineAlpha = 1 - dist / maxDist;
              ctx.globalAlpha = lineAlpha * 0.015;
              ctx.beginPath();
              ctx.moveTo(p1x, p1y);
              ctx.lineTo(p2x, p2y);
              ctx.stroke();
            }
          }
        }
        ctx.restore();
      }

      // Shooting stars
      const interval = isLowPerf ? SHOOTING_STAR_INTERVAL_LOW : SHOOTING_STAR_INTERVAL;
      if (time - lastShootingStarRef.current > interval + Math.random() * 7000) {
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
      nebula2TexRef.current = null;
      nebula3TexRef.current = null;
      nebula4TexRef.current = null;
      spiralGalaxyTexRef.current = null;
    };
  }, [initStars, spawnShootingStar, initFGStars]);

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
