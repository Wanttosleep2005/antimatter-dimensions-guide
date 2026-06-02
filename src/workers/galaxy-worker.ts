/**
 * Galaxy computation worker — offloads spiral arm point calculation
 * from the main thread so the Canvas render loop stays smooth.
 */

interface GalaxyConfig {
  gx: number;
  gy: number;
  gR: number;
  armCount: number;
  armTurns: number;
  armSegments: number;
  galaxyRotation: number;
}

interface WorkerMessage {
  type: 'config';
  config: GalaxyConfig;
}

function computeSpiralArms(config: GalaxyConfig) {
  const { gx, gy, gR, armCount, armTurns, armSegments, galaxyRotation } = config;
  const allPoints: { x: number; y: number }[][] = [];

  for (let a = 0; a < armCount; a++) {
    const baseAngle = (a / armCount) * Math.PI * 2 + 0.5 + galaxyRotation;
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i <= armSegments; i++) {
      const t = i / armSegments;
      const theta = baseAngle + t * armTurns * Math.PI * 2;
      const r = gR * (0.04 + t * 0.76);
      pts.push({
        x: gx + Math.cos(theta) * r,
        y: gy + Math.sin(theta) * r * 0.58,
      });
    }
    allPoints.push(pts);
  }

  return allPoints;
}

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  if (e.data.type === 'config') {
    const result = computeSpiralArms(e.data.config);
    self.postMessage({ type: 'armPoints', points: result });
  }
};
