import { useRef, useEffect } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  initRadius: number;
  mass: number;
  angle: number;
  hue: number;
  size: number;
  opacity: number;
  trail: { x: number; y: number; age: number }[];
  captured: boolean;
  captureTime: number;
  flashAge: number;
}

interface AbsorbFlash {
  x: number;
  y: number;
  age: number;
  maxAge: number;
  hue: number;
}

interface GravWave {
  startTime: number;
  radius: number;
  opacity: number;
}

interface DebrisParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
}

export function BlackHole() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = window.innerWidth;
    let h = window.innerHeight;
    let raf = 0;
    let lastFrame = 0;
    let time = 0;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
    };
    resize();
    window.addEventListener('resize', resize);

    // ---- Black hole state ----
    const bhBase = { x: w * 0.78, y: h * 0.35 };
    const bh = {
      x: bhBase.x,
      y: bhBase.y,
      baseX: bhBase.x,
      baseY: bhBase.y,
      radius: Math.min(w, h) * 0.22,
      mass: 1,
      dragged: false,
    };

    // ---- Mouse drag interaction ----
    let mouseX = bhBase.x;
    let mouseY = bhBase.y;
    let isMouseDown = false;
    let mouseNearBH = false;

    const onMouseDown = (e: MouseEvent) => {
      isMouseDown = true;
      const dx = e.clientX - bh.x;
      const dy = e.clientY - bh.y;
      if (Math.sqrt(dx * dx + dy * dy) < bh.radius * 1.5) {
        bh.dragged = true;
        bh.baseX = bh.x;
        bh.baseY = bh.y;
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (bh.dragged) {
        bh.x = e.clientX;
        bh.y = e.clientY;
      } else {
        const dx = e.clientX - bh.x;
        const dy = e.clientY - bh.y;
        mouseNearBH = Math.sqrt(dx * dx + dy * dy) < bh.radius * 2;
      }
    };

    const onMouseUp = () => {
      isMouseDown = false;
      bh.dragged = false;
      // Smoothly return to base position when released
    };

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // ---- Particles ----
    const particles: Particle[] = [];
    const MAX_PARTICLES = 40;
    const GRAVITY = 0.00048; // stronger gravity for more dramatic infall
    const BH_EVENT_HORIZON = 0.46; // ratio of bh.radius
    const CAPTURE_RADIUS = 0.62; // ratio of bh.radius
    let lastSpawn = 0;
    const SPAWN_INTERVAL = 350; // faster spawn

    const spawnParticle = () => {
      const angle = Math.random() * Math.PI * 2;
      const initR = bh.radius * (2.2 + Math.random() * 2.8);
      const tangentialSpeed = 0.15 + Math.random() * 0.35;

      particles.push({
        x: bh.x + Math.cos(angle) * initR,
        y: bh.y + Math.sin(angle) * initR * 0.42,
        vx: -Math.sin(angle) * tangentialSpeed,
        vy: Math.cos(angle) * tangentialSpeed * 0.42,
        radius: initR,
        initRadius: initR,
        mass: 0.8 + Math.random() * 0.4,
        angle,
        hue: Math.random() > 0.5 ? 260 + Math.random() * 40 : 15 + Math.random() * 35,
        size: 1 + Math.random() * 2.2,
        opacity: 0.12 + Math.random() * 0.18,
        trail: [],
        captured: false,
        captureTime: 0,
        flashAge: 0,
      });
    };

    // Pre-spawn more particles
    for (let i = 0; i < 14; i++) spawnParticle();

    // ---- Absorption flashes ----
    const flashes: AbsorbFlash[] = [];

    const spawnFlash = (x: number, y: number, hue: number) => {
      flashes.push({ x, y, age: 0, maxAge: 25 + Math.random() * 20, hue });
    };

    // ---- Debris particles (burst on absorption) ----
    const debris: DebrisParticle[] = [];

    const spawnDebris = (x: number, y: number, hue: number) => {
      for (let i = 0; i < 8; i++) {
        const a = Math.random() * Math.PI * 2;
        const spd = 2 + Math.random() * 4;
        debris.push({
          x, y,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd * 0.4,
          life: 0,
          maxLife: 20 + Math.random() * 30,
          size: 1 + Math.random() * 2,
          hue,
        });
      }
    };

    // ---- Gravitational waves ----
    const gravWaves: GravWave[] = [];
    let lastWaveTime = 0;

    const animate = (timestamp: number) => {
      if (timestamp - lastFrame < 32) {
        raf = requestAnimationFrame(animate);
        return;
      }
      lastFrame = timestamp;
      time = timestamp;

      if (document.hidden) {
        raf = requestAnimationFrame(animate);
        return;
      }

      ctx.clearRect(0, 0, w, h);

      // Smooth return to base position when not dragged
      if (!bh.dragged) {
        bh.x += (bh.baseX - bh.x) * 0.06;
        bh.y += (bh.baseY - bh.y) * 0.06;
      }

      // ---- Spawn gravitational wave ----
      if (timestamp - lastWaveTime > 3200) {
        gravWaves.push({ startTime: timestamp, radius: bh.radius * 0.9, opacity: 0.07 });
        lastWaveTime = timestamp;
      }

      for (let i = gravWaves.length - 1; i >= 0; i--) {
        const gw = gravWaves[i];
        const age = timestamp - gw.startTime;
        if (age > 7000) { gravWaves.splice(i, 1); continue; }
        gw.radius += 1.2;
        gw.opacity *= 0.9995;
      }

      // ---- Spawn new particles ----
      if (timestamp - lastSpawn > SPAWN_INTERVAL && particles.length < MAX_PARTICLES) {
        spawnParticle();
        lastSpawn = timestamp;
      }

      // ---- Update & remove absorbed particles, collect flashes ----
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        if (!p.captured) {
          // --- Gravitational force (F = G*M/r²) ---
          const dx = bh.x - p.x;
          const dy = bh.y - p.y;
          const distSq = dx * dx + dy * dy;
          const dist = Math.sqrt(distSq);

          // Gravitational acceleration
          const gravAcc = GRAVITY * bh.mass * bh.radius * bh.radius / Math.max(distSq, bh.radius * bh.radius * 0.1);
          const ax = (dx / dist) * gravAcc;
          const ay = (dy / dist) * gravAcc;

          p.vx += ax;
          p.vy += ay;

          // Velocity cap for stability
          const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
          if (spd > 4) {
            p.vx = (p.vx / spd) * 4;
            p.vy = (p.vy / spd) * 4;
          }

          p.x += p.vx;
          p.y += p.vy;

          p.radius = dist;
          p.trail.push({ x: p.x, y: p.y, age: 0 });
          if (p.trail.length > 22) p.trail.shift();

          for (const t of p.trail) t.age++;

          // Check capture
          if (dist < bh.radius * BH_EVENT_HORIZON) {
            p.captured = true;
            p.captureTime = timestamp;
            spawnFlash(p.x, p.y, p.hue);
            spawnDebris(p.x, p.y, p.hue);
          }
        } else {
          // Captured — spiral inward quickly
          const age = timestamp - p.captureTime;
          const frac = Math.min(1, age / 400);
          const spiralRadius = bh.radius * BH_EVENT_HORIZON * frac;
          const spiralAngle = p.angle + age * 0.05;
          p.x = bh.x + Math.cos(spiralAngle) * spiralRadius;
          p.y = bh.y + Math.sin(spiralAngle) * spiralRadius * 0.42;
          p.flashAge = age;

          if (frac >= 1) {
            particles.splice(i, 1);
            continue;
          }
        }
      }

      // ---- Update debris ----
      for (let i = debris.length - 1; i >= 0; i--) {
        const d = debris[i];
        d.x += d.vx;
        d.y += d.vy;
        d.vx *= 0.92;
        d.vy *= 0.92;
        d.life++;
        if (d.life > d.maxLife) debris.splice(i, 1);
      }

      // ---- Update flashes ----
      for (let i = flashes.length - 1; i >= 0; i--) {
        flashes[i].age++;
        if (flashes[i].age > flashes[i].maxAge) flashes.splice(i, 1);
      }

      // =================== RENDER ===================

      // 0. Outer gravitational glow — more intense
      {
        const glowR = ctx.createRadialGradient(bh.x, bh.y, bh.radius * 0.5, bh.x, bh.y, bh.radius * 3.2);
        glowR.addColorStop(0, 'rgba(20, 5, 50, 0)');
        glowR.addColorStop(0.2, 'rgba(60, 20, 120, 0.05)');
        glowR.addColorStop(0.45, 'rgba(80, 30, 140, 0.08)');
        glowR.addColorStop(0.65, 'rgba(40, 15, 80, 0.04)');
        glowR.addColorStop(0.85, 'rgba(10, 3, 30, 0.015)');
        glowR.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glowR;
        ctx.beginPath();
        ctx.arc(bh.x, bh.y, bh.radius * 3.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // 0a. Gravitational lensing — spacetime curvature rings (ENHANCED)
      {
        ctx.save();
        const warpPulse = 1 + 0.2 * Math.sin(time * 0.0015); // pulsating intensity
        ctx.globalAlpha = 0.04 * warpPulse;
        for (let ring = 0; ring < 8; ring++) {
          const r = bh.radius * (0.85 + ring * 0.32);
          const hue = 250 + ring * 15;
          ctx.strokeStyle = `hsla(${hue}, 50%, 70%, 0.8)`;
          ctx.lineWidth = 0.6 + ring * 0.08;
          ctx.beginPath();
          for (let a = 0; a < Math.PI * 2; a += 0.012) {
            // Distortion increases near event horizon
            const distortionScale = 0.03 * (1 + 1 / Math.max(ring + 0.5, 1)) * warpPulse;
            const wobble = Math.sin(a * 10 + time * 0.001 + ring * 1.2) * bh.radius * distortionScale;
            const wx = bh.x + Math.cos(a) * (r + wobble);
            const wy = bh.y + Math.sin(a) * (r + wobble * 0.45) * 0.42;
            if (a === 0) ctx.moveTo(wx, wy);
            else ctx.lineTo(wx, wy);
          }
          ctx.closePath();
          ctx.stroke();
        }
        ctx.restore();
      }

      // 0d. Gravitational mirage — secondary light ring (double-image effect)
      {
        const miragePulse = 0.04 + 0.02 * Math.sin(time * 0.002);
        ctx.save();
        ctx.globalAlpha = miragePulse;
        const mirageGrad = ctx.createRadialGradient(bh.x, bh.y, bh.radius * 1.05, bh.x, bh.y, bh.radius * 1.25);
        mirageGrad.addColorStop(0, 'rgba(0,0,0,0)');
        mirageGrad.addColorStop(0.25, 'rgba(180, 210, 255, 0.15)');
        mirageGrad.addColorStop(0.4, 'rgba(200, 220, 255, 0.25)');
        mirageGrad.addColorStop(0.5, 'rgba(180, 210, 255, 0.15)');
        mirageGrad.addColorStop(0.65, 'rgba(0,0,0,0)');
        mirageGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = mirageGrad;
        ctx.beginPath();
        ctx.ellipse(bh.x, bh.y, bh.radius * 1.25, bh.radius * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 0e. Einstein cross simulation — 4 bright caustic points
      {
        const crossPulse = 1 + 0.3 * Math.sin(time * 0.0025);
        ctx.save();
        const crossDist = bh.radius * 1.08;
        const crossAlpha = 0.06 * crossPulse;
        const crossPoints = [
          { x: Math.cos(0) * crossDist, y: Math.sin(0) * crossDist * 0.42 },
          { x: Math.cos(Math.PI / 2) * crossDist, y: Math.sin(Math.PI / 2) * crossDist * 0.42 },
          { x: Math.cos(Math.PI) * crossDist, y: Math.sin(Math.PI) * crossDist * 0.42 },
          { x: Math.cos(3 * Math.PI / 2) * crossDist, y: Math.sin(3 * Math.PI / 2) * crossDist * 0.42 },
        ];
        for (const cp of crossPoints) {
          const cx = bh.x + cp.x;
          const cy = bh.y + cp.y;
          const cGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, bh.radius * 0.08);
          cGrad.addColorStop(0, `rgba(255, 250, 255, ${crossAlpha * 2})`);
          cGrad.addColorStop(0.4, `rgba(200, 210, 255, ${crossAlpha})`);
          cGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = cGrad;
          ctx.beginPath();
          ctx.arc(cx, cy, bh.radius * 0.08, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // 0b. Gravitational wave rings
      {
        ctx.save();
        for (const gw of gravWaves) {
          const age = time - gw.startTime;
          const gwR = bh.radius * 0.9 + age * 0.4;
          const alpha = gw.opacity * (1 - age / 7000);
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = 'rgba(180, 160, 255, 1)';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.ellipse(bh.x, bh.y, gwR * 1.8, gwR * 0.38, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 0c. Gravitational attraction field lines
      {
        ctx.save();
        ctx.globalAlpha = 0.018;
        ctx.strokeStyle = 'rgba(210, 180, 255, 1)';
        ctx.lineWidth = 0.6;
        for (let ray = 0; ray < 20; ray++) {
          const ra = (ray / 16) * Math.PI * 2;
          const rx1 = bh.x + Math.cos(ra) * bh.radius * 2.5;
          const ry1 = bh.y + Math.sin(ra) * bh.radius * 0.8;
          const rx2 = bh.x - Math.cos(ra) * bh.radius * 0.52;
          const ry2 = bh.y - Math.sin(ra) * bh.radius * 0.52 * 0.42;
          ctx.beginPath();
          ctx.moveTo(rx1, ry1);
          ctx.quadraticCurveTo(
            bh.x + Math.cos(ra + 0.2) * bh.radius * 0.3,
            bh.y + Math.sin(ra + 0.2) * bh.radius * 0.12,
            rx2, ry2
          );
          ctx.stroke();
        }
        ctx.restore();
      }

      // 1. Accretion disk layers — 7 layers for cinematic depth
      {
        const diskAngle = time * 0.00008;
        const diskLayers = 7;
        for (let i = 0; i < diskLayers; i++) {
          const t = i / diskLayers;
          const innerR = bh.radius * (0.68 + t * 0.18);
          const outerR = bh.radius * (0.85 + t * 0.25);
          const rx = outerR * 1.7;
          const ry = outerR * 0.32;

          ctx.save();
          ctx.translate(bh.x, bh.y);
          ctx.rotate(diskAngle + t * 0.4);
          ctx.globalAlpha = 0.10 - t * 0.013;

          const dGrad = ctx.createRadialGradient(0, 0, innerR, 0, 0, outerR);
          const h1 = 250 + t * 60;
          const h2 = 270 + t * 70;
          dGrad.addColorStop(0, `hsla(${h1}, 60%, 50%, 0)`);
          dGrad.addColorStop(0.3, `hsla(${h2}, 75%, 58%, 0.8)`);
          dGrad.addColorStop(0.55, `hsla(${h1}, 55%, 42%, 0.45)`);
          dGrad.addColorStop(0.8, `hsla(${h2}, 40%, 35%, 0.1)`);
          dGrad.addColorStop(1, `hsla(${h2}, 30%, 25%, 0)`);

          ctx.fillStyle = dGrad;
          ctx.beginPath();
          ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // 2. Particles (rendered behind event horizon)
      for (const p of particles) {
        // Trail
        if (p.trail.length > 2) {
          ctx.save();
          for (let t = 1; t < p.trail.length; t++) {
            const trailAlpha = p.opacity * (t / p.trail.length) * 0.4;
            ctx.globalAlpha = trailAlpha;
            ctx.strokeStyle = `hsla(${p.hue}, 60%, 65%, 1)`;
            ctx.lineWidth = p.size * 0.5 * (t / p.trail.length);
            ctx.beginPath();
            ctx.moveTo(p.trail[t - 1].x, p.trail[t - 1].y);
            ctx.lineTo(p.trail[t].x, p.trail[t].y);
            ctx.stroke();
          }
          ctx.restore();
        }

        if (p.captured) {
          // Spaghettification during capture — more dramatic
          const frac = Math.min(1, (time - p.captureTime) / 350);
          const prox = frac;
          const stretch = 1 + prox * 8; // more extreme stretching

          ctx.save();
          ctx.globalAlpha = (1 - frac) * p.opacity * 1.3;
          const dx = bh.x - p.x;
          const dy = bh.y - p.y;
          const ang = Math.atan2(dy, dx);
          ctx.translate(p.x, p.y);
          ctx.rotate(ang);
          ctx.scale(stretch, 1 / Math.max(stretch * 0.3, 1));

          const cGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size * 1.5);
          const redshiftHue = p.hue - prox * 50; // more redshift
          cGrad.addColorStop(0, `hsla(${redshiftHue}, 80%, 80%, 0.95)`);
          cGrad.addColorStop(0.3, `hsla(${redshiftHue}, 65%, 60%, 0.55)`);
          cGrad.addColorStop(0.6, `hsla(${redshiftHue}, 50%, 45%, 0.2)`);
          cGrad.addColorStop(1, `hsla(${redshiftHue}, 40%, 35%, 0)`);
          ctx.fillStyle = cGrad;
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 1.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else {
          // Normal orbiting particle
          const proxToCapture = Math.max(0, 1 - (p.radius - bh.radius * BH_EVENT_HORIZON) / (p.initRadius - bh.radius * BH_EVENT_HORIZON));
          const glowSize = p.size * (1 + proxToCapture * 2);

          ctx.save();
          ctx.globalAlpha = p.opacity;
          const pGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowSize);
          pGrad.addColorStop(0, `hsla(${p.hue}, 70%, 75%, 1)`);
          pGrad.addColorStop(0.4, `hsla(${p.hue}, 60%, 55%, 0.6)`);
          pGrad.addColorStop(1, `hsla(${p.hue}, 50%, 40%, 0)`);
          ctx.fillStyle = pGrad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, glowSize, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // 2b. Debris particles — more dramatic burst
      for (const d of debris) {
        const fade = 1 - d.life / d.maxLife;
        const pct = d.life / d.maxLife;
        // Particles glow brighter mid-flight
        const glowFactor = pct < 0.2 ? pct / 0.2 : (1 - pct) / 0.8;
        ctx.save();
        ctx.globalAlpha = fade * 0.55 * glowFactor;
        const dGrad = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.size * 3);
        dGrad.addColorStop(0, `hsla(${d.hue}, 80%, 85%, 0.95)`);
        dGrad.addColorStop(0.3, `hsla(${d.hue}, 65%, 65%, 0.5)`);
        dGrad.addColorStop(0.6, `hsla(${d.hue}, 50%, 45%, 0.15)`);
        dGrad.addColorStop(1, `hsla(${d.hue}, 40%, 30%, 0)`);
        ctx.fillStyle = dGrad;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.size * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 2c. Absorption flashes — more dramatic
      for (const fl of flashes) {
        const t = fl.age / fl.maxAge;
        const alpha = t < 0.25 ? t / 0.25 : (1 - t) / 0.75;
        const flashR = bh.radius * 0.12 * (0.5 + t * 0.8);

        ctx.save();
        ctx.globalAlpha = alpha * 0.65;
        const flGrad = ctx.createRadialGradient(fl.x, fl.y, 0, fl.x, fl.y, flashR * 4);
        flGrad.addColorStop(0, `hsla(${fl.hue}, 85%, 92%, 0.95)`);
        flGrad.addColorStop(0.25, `hsla(${fl.hue}, 75%, 78%, 0.55)`);
        flGrad.addColorStop(0.55, `hsla(${fl.hue}, 55%, 55%, 0.15)`);
        flGrad.addColorStop(1, `hsla(${fl.hue}, 40%, 40%, 0)`);
        ctx.fillStyle = flGrad;
        ctx.beginPath();
        ctx.arc(fl.x, fl.y, flashR * 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 3. Photon ring — brilliant with breathing pulse
      {
        const photonPulse = 1 + 0.15 * Math.sin(time * 0.004);
        const phGrad = ctx.createRadialGradient(bh.x, bh.y, bh.radius * 0.42, bh.x, bh.y, bh.radius * 0.66);
        phGrad.addColorStop(0, 'rgba(0,0,0,0)');
        phGrad.addColorStop(0.43, `rgba(180, 155, 255, ${0.18 * photonPulse})`);
        phGrad.addColorStop(0.49, `rgba(250, 220, 255, ${0.55 * photonPulse})`);
        phGrad.addColorStop(0.52, 'rgba(255, 240, 255, 0.2)');
        phGrad.addColorStop(0.55, `rgba(180, 155, 255, ${0.18 * photonPulse})`);
        phGrad.addColorStop(0.61, 'rgba(0,0,0,0)');
        phGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = phGrad;
        ctx.beginPath();
        ctx.arc(bh.x, bh.y, bh.radius * 0.66, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3a. Einstein ring arcs — more dramatic
      {
        ctx.save();
        ctx.globalAlpha = 0.35;
        for (let a = 0; a < 8; a++) {
          const ea = (a / 8) * Math.PI * 2;
          const er = bh.radius * 0.66;
          const ex = bh.x + Math.cos(ea) * er;
          const ey = bh.y + Math.sin(ea) * er * 0.48;
          const arcGrad = ctx.createRadialGradient(ex, ey, 0, ex, ey, bh.radius * 0.07);
          arcGrad.addColorStop(0, `hsla(${255 + a * 22}, 75%, 80%, 0.8)`);
          arcGrad.addColorStop(0.25, `hsla(${255 + a * 22}, 65%, 60%, 0.45)`);
          arcGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = arcGrad;
          ctx.beginPath();
          ctx.arc(ex, ey, bh.radius * 0.07, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // 3b. Gravitational lensing streaks — more dramatic
      {
        ctx.save();
        for (let s = 0; s < 55; s++) {
          const sa = (s / 55) * Math.PI * 2 + time * 0.0005;
          const sr = bh.radius * (0.68 + (s % 4) * 0.14);
          const sx = bh.x + Math.cos(sa) * sr;
          const sy = bh.y + Math.sin(sa) * sr * 0.42;
          ctx.translate(sx, sy);
          const ta = sa + Math.PI / 2;
          ctx.rotate(ta);
          const sl = bh.radius * (0.07 + Math.random() * 0.09);
          const sGrad = ctx.createLinearGradient(-sl, 0, sl, 0);
          const sAlpha = 0.04 + Math.random() * 0.05;
          sGrad.addColorStop(0, 'rgba(0,0,0,0)');
          sGrad.addColorStop(0.35, `rgba(210, 220, 255, ${sAlpha * 3})`);
          sGrad.addColorStop(0.5, `rgba(235, 225, 255, ${sAlpha * 4})`);
          sGrad.addColorStop(0.65, `rgba(210, 220, 255, ${sAlpha * 3})`);
          sGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = sGrad;
          ctx.fillRect(-sl, -1, sl * 2, 2);
          ctx.rotate(-ta);
          ctx.translate(-sx, -sy);
        }
        ctx.restore();
      }

      // 3c. Caustic bright spots — larger and more dramatic
      {
        const caustics = [0.3, 1.8, 3.5, 5.2];
        for (const ca of caustics) {
          const cx = bh.x + Math.cos(ca + time * 0.0003) * bh.radius * 0.72;
          const cy = bh.y + Math.sin(ca + time * 0.0003) * bh.radius * 0.35;
          const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, bh.radius * 0.11);
          cg.addColorStop(0, 'rgba(255, 245, 250, 0.16)');
          cg.addColorStop(0.15, 'rgba(230, 200, 255, 0.10)');
          cg.addColorStop(0.4, 'rgba(170, 130, 240, 0.04)');
          cg.addColorStop(0.7, 'rgba(100, 70, 180, 0.01)');
          cg.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = cg;
          ctx.beginPath();
          ctx.arc(cx, cy, bh.radius * 0.11, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 4. Event horizon — with subtle inner glow
      {
        const ehGrad = ctx.createRadialGradient(bh.x, bh.y, 0, bh.x, bh.y, bh.radius * 0.48);
        ehGrad.addColorStop(0, 'rgba(1, 0, 6, 0.97)');
        ehGrad.addColorStop(0.5, 'rgba(2, 1, 10, 0.85)');
        ehGrad.addColorStop(0.8, 'rgba(4, 2, 14, 0.55)');
        ehGrad.addColorStop(1, 'rgba(6, 3, 18, 0)');
        ctx.fillStyle = ehGrad;
        ctx.beginPath();
        ctx.arc(bh.x, bh.y, bh.radius * 0.48, 0, Math.PI * 2);
        ctx.fill();

        // Shadow edge glow — faint purple rim light penetrating the horizon edge
        const shadowGrad = ctx.createRadialGradient(bh.x, bh.y, bh.radius * 0.44, bh.x, bh.y, bh.radius * 0.49);
        shadowGrad.addColorStop(0, 'rgba(0,0,0,0)');
        shadowGrad.addColorStop(0.7, 'rgba(140, 100, 240, 0.06)');
        shadowGrad.addColorStop(0.9, 'rgba(100, 70, 200, 0.02)');
        shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = shadowGrad;
        ctx.beginPath();
        ctx.arc(bh.x, bh.y, bh.radius * 0.49, 0, Math.PI * 2);
        ctx.fill();
      }

      // 4a. Inner hot rim — dramatic light penetration
      {
        const rimAlpha = 0.32 + 0.15 * Math.sin(time * 0.003);
        ctx.save();
        ctx.globalAlpha = rimAlpha;
        // Multi-band rim with temperature gradient
        // Band 1: Outer cool blue corona
        const rimCool = ctx.createRadialGradient(bh.x, bh.y, bh.radius * 0.50, bh.x, bh.y, bh.radius * 0.56);
        rimCool.addColorStop(0, 'rgba(0,0,0,0)');
        rimCool.addColorStop(0.4, 'rgba(180, 200, 255, 0.08)');
        rimCool.addColorStop(0.7, 'rgba(140, 160, 240, 0.03)');
        rimCool.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = rimCool;
        ctx.beginPath();
        ctx.arc(bh.x, bh.y, bh.radius * 0.56, 0, Math.PI * 2);
        ctx.fill();

        // Band 2: Main hot rim — white-hot light penetration
        const rimHot = ctx.createRadialGradient(bh.x, bh.y, bh.radius * 0.43, bh.x, bh.y, bh.radius * 0.53);
        rimHot.addColorStop(0, 'rgba(0,0,0,0)');
        rimHot.addColorStop(0.42, 'rgba(255, 240, 200, 0.12)');
        rimHot.addColorStop(0.48, 'rgba(255, 210, 130, 0.6)');
        rimHot.addColorStop(0.54, 'rgba(255, 180, 80, 0.25)');
        rimHot.addColorStop(0.65, 'rgba(200, 100, 40, 0.06)');
        rimHot.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = rimHot;
        ctx.beginPath();
        ctx.arc(bh.x, bh.y, bh.radius * 0.53, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // 5. Polar jets — more dramatic
      {
        const jetPulse = 1 + 0.2 * Math.sin(time * 0.002);
        const jetGrad1 = ctx.createLinearGradient(bh.x, bh.y - bh.radius * 3, bh.x, bh.y - bh.radius * 0.5);
        jetGrad1.addColorStop(0, 'rgba(0, 0, 0, 0)');
        jetGrad1.addColorStop(0.3, `rgba(200, 160, 255, ${0.05 * jetPulse})`);
        jetGrad1.addColorStop(0.5, `rgba(160, 110, 240, ${0.08 * jetPulse})`);
        jetGrad1.addColorStop(0.7, 'rgba(100, 60, 200, 0.03)');
        jetGrad1.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.save();
        ctx.translate(bh.x, bh.y);
        ctx.scale(0.12, 1);
        ctx.translate(-bh.x, -bh.y);
        ctx.fillStyle = jetGrad1;
        ctx.fillRect(bh.x - bh.radius, bh.y - bh.radius * 3, bh.radius * 2, bh.radius * 2.5);
        ctx.restore();

        const jetGrad2 = ctx.createLinearGradient(bh.x, bh.y + bh.radius * 0.5, bh.x, bh.y + bh.radius * 3);
        jetGrad2.addColorStop(0, 'rgba(100, 60, 200, 0.03)');
        jetGrad2.addColorStop(0.3, `rgba(160, 110, 240, ${0.07 * jetPulse})`);
        jetGrad2.addColorStop(0.5, `rgba(200, 160, 255, ${0.05 * jetPulse})`);
        jetGrad2.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.save();
        ctx.translate(bh.x, bh.y);
        ctx.scale(0.12, 1);
        ctx.translate(-bh.x, -bh.y);
        ctx.fillStyle = jetGrad2;
        ctx.fillRect(bh.x - bh.radius, bh.y + bh.radius * 0.5, bh.radius * 2, bh.radius * 2.5);
        ctx.restore();
      }

      // 6. Orbital micro-stars — more dramatic
      {
        const orbitAngle = time * 0.0006;
        for (let s = 0; s < 18; s++) {
          const sa = orbitAngle + (s / 18) * Math.PI * 2;
          const sr = bh.radius * (1.02 + (s % 5) * 0.14);
          const sx = bh.x + Math.cos(sa) * sr;
          const sy = bh.y + Math.sin(sa) * sr * 0.44;
          ctx.save();
          ctx.globalAlpha = 0.08 + 0.06 * Math.sin(time * 0.005 + s);
          ctx.fillStyle = 'rgba(235, 225, 255, 1)';
          ctx.beginPath();
          ctx.arc(sx, sy, 0.9 + (s % 4) * 0.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // 7. Mouse interaction — attraction cursor glow
      if (mouseNearBH && !bh.dragged) {
        const mx = mouseX - bh.x;
        const my = mouseY - bh.y;
        const mDist = Math.sqrt(mx * mx + my * my);
        const attGrad = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, bh.radius * 0.6);
        attGrad.addColorStop(0, 'rgba(168, 128, 255, 0.12)');
        attGrad.addColorStop(1, 'rgba(168, 128, 255, 0)');
        ctx.save();
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = attGrad;
        ctx.beginPath();
        ctx.arc(mouseX, mouseY, bh.radius * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}
