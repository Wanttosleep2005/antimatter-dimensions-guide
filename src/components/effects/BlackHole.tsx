import { useRef, useEffect } from 'react';

/**
 * Canvas-based black hole with accretion disk, photon ring, and particle jets.
 * Rendered as a fixed background element with low opacity.
 */
export function BlackHole() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = window.innerWidth;
    let h = window.innerHeight;
    let angle = 0;
    let raf = 0;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
    };

    resize();
    window.addEventListener('resize', resize);

    // Black hole center — positioned at the right side, mid-upper
    const bh = {
      cx: w * 0.78,
      cy: h * 0.35,
      radius: Math.min(w, h) * 0.22,
    };

    const animate = () => {
      angle += 0.0008;
      ctx.clearRect(0, 0, w, h);

      // ---- 1. Outer glow (gravitational lensing halo) ----
      const outerGlow = ctx.createRadialGradient(bh.cx, bh.cy, bh.radius * 0.55, bh.cx, bh.cy, bh.radius * 2.8);
      outerGlow.addColorStop(0, 'rgba(30, 10, 60, 0)');
      outerGlow.addColorStop(0.3, 'rgba(80, 30, 140, 0.04)');
      outerGlow.addColorStop(0.55, 'rgba(50, 20, 100, 0.07)');
      outerGlow.addColorStop(0.75, 'rgba(20, 10, 40, 0.03)');
      outerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = outerGlow;
      ctx.beginPath();
      ctx.arc(bh.cx, bh.cy, bh.radius * 2.8, 0, Math.PI * 2);
      ctx.fill();

      // ---- 2. Accretion disk — elliptical rings ----
      const diskLayers = 5;
      for (let i = 0; i < diskLayers; i++) {
        const t = i / diskLayers;
        const innerR = bh.radius * (0.75 + t * 0.15);
        const outerR = bh.radius * (0.9 + t * 0.22);
        const diskAngle = angle + t * 0.4;
        const rx = outerR * 1.65;
        const ry = outerR * 0.28;

        ctx.save();
        ctx.translate(bh.cx, bh.cy);
        ctx.rotate(diskAngle);
        ctx.globalAlpha = 0.08 - t * 0.012;

        const diskGrad = ctx.createRadialGradient(0, 0, innerR, 0, 0, outerR);
        const hue1 = 260 + t * 50;  // blue-violet to magenta
        const hue2 = 280 + t * 60;
        diskGrad.addColorStop(0, `hsla(${hue1}, 60%, 50%, 0)`);
        diskGrad.addColorStop(0.3, `hsla(${hue2}, 70%, 55%, 0.7)`);
        diskGrad.addColorStop(0.6, `hsla(${hue1}, 50%, 40%, 0.4)`);
        diskGrad.addColorStop(1, `hsla(${hue2}, 40%, 30%, 0)`);

        ctx.fillStyle = diskGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // ---- 3. Photon ring (bright thin ring at event horizon edge) ----
      const photonRing = ctx.createRadialGradient(bh.cx, bh.cy, bh.radius * 0.44, bh.cx, bh.cy, bh.radius * 0.62);
      photonRing.addColorStop(0, 'rgba(0, 0, 0, 0)');
      photonRing.addColorStop(0.45, 'rgba(180, 150, 255, 0.15)');
      photonRing.addColorStop(0.52, 'rgba(220, 190, 255, 0.35)');
      photonRing.addColorStop(0.58, 'rgba(180, 150, 255, 0.15)');
      photonRing.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = photonRing;
      ctx.beginPath();
      ctx.arc(bh.cx, bh.cy, bh.radius * 0.62, 0, Math.PI * 2);
      ctx.fill();

      // ---- 4. Event horizon (dark circle) ----
      const eventHorizon = ctx.createRadialGradient(bh.cx, bh.cy, 0, bh.cx, bh.cy, bh.radius * 0.46);
      eventHorizon.addColorStop(0, 'rgba(2, 1, 8, 0.95)');
      eventHorizon.addColorStop(0.7, 'rgba(4, 2, 14, 0.7)');
      eventHorizon.addColorStop(1, 'rgba(6, 3, 18, 0)');
      ctx.fillStyle = eventHorizon;
      ctx.beginPath();
      ctx.arc(bh.cx, bh.cy, bh.radius * 0.46, 0, Math.PI * 2);
      ctx.fill();

      // ---- 5. Particle jets (subtle vertical streams) ----
      for (let j = 0; j < 2; j++) {
        const jetX = bh.cx + (j === 0 ? -bh.radius * 0.12 : bh.radius * 0.12);
        const jetDir = j === 0 ? -1 : 1;
        for (let p = 0; p < 35; p++) {
          const pT = p / 35;
          const pY = bh.cy + jetDir * (bh.radius * 0.5 + pT * bh.radius * 1.3);
          const pX = jetX + Math.sin(pT * 8 + angle * 5) * bh.radius * 0.06;
          const pR = 1.5 + (1 - pT) * 2.5;
          const pAlpha = (1 - pT) * 0.08;

          ctx.globalAlpha = pAlpha;
          const jetGrad = ctx.createRadialGradient(pX, pY, 0, pX, pY, pR);
          jetGrad.addColorStop(0, 'rgba(160, 200, 255, 0.6)');
          jetGrad.addColorStop(1, 'rgba(80, 120, 220, 0)');
          ctx.fillStyle = jetGrad;
          ctx.beginPath();
          ctx.arc(pX, pY, pR, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // ---- 6. Faint orbital star particles near black hole ----
      for (let s = 0; s < 25; s++) {
        const orbitR = bh.radius * (0.7 + (s / 25) * 1.3);
        const orbitAngle = angle * 3 + (s / 25) * Math.PI * 2;
        const sx = bh.cx + Math.cos(orbitAngle) * orbitR;
        const sy = bh.cy + Math.sin(orbitAngle) * orbitR * 0.35;
        const sAlpha = 0.03 + Math.random() * 0.04;

        ctx.globalAlpha = sAlpha;
        ctx.fillStyle = 'rgba(200, 180, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

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
