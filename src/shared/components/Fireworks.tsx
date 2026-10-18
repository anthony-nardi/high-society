import { useEffect, useRef } from "react";

/*
 * A short fireworks display over the whole screen: a few rockets rise and
 * burst into sparks that fall and fade. Drawn on a canvas that ignores
 * pointer events, stopped after a few seconds, and skipped for anyone who
 * prefers reduced motion.
 */

type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  colour: string;
  size: number;
};

type Rocket = {
  x: number;
  y: number;
  vy: number;
  targetY: number;
  colour: string;
};

const COLOURS = [
  "#ffd86b",
  "#ff6b6b",
  "#6bd3ff",
  "#b4ff6b",
  "#ff8ad8",
  "#ffffff",
  "#ffa94d",
];

export const FIREWORKS_SECONDS = 6;

export default function Fireworks({
  seconds = FIREWORKS_SECONDS,
}: {
  seconds?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const sparks: Spark[] = [];
    const rockets: Rocket[] = [];
    const started = performance.now();
    let last = started;
    let nextLaunch = started;
    let frame = 0;

    const launch = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      rockets.push({
        x: w * (0.15 + Math.random() * 0.7),
        y: h,
        vy: -(h * (0.9 + Math.random() * 0.5)),
        targetY: h * (0.15 + Math.random() * 0.35),
        colour: COLOURS[Math.floor(Math.random() * COLOURS.length)],
      });
    };

    const burst = (r: Rocket) => {
      const count = 70 + Math.floor(Math.random() * 50);
      const speed = 90 + Math.random() * 120;
      const second = COLOURS[Math.floor(Math.random() * COLOURS.length)];
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.1;
        const v = speed * (0.6 + Math.random() * 0.6);
        sparks.push({
          x: r.x,
          y: r.y,
          vx: Math.cos(angle) * v,
          vy: Math.sin(angle) * v,
          life: 0,
          maxLife: 1.2 + Math.random() * 1.2,
          colour: Math.random() < 0.7 ? r.colour : second,
          size: 1.5 + Math.random() * 2,
        });
      }
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const elapsed = (now - started) / 1000;
      const w = window.innerWidth;
      const h = window.innerHeight;

      if (elapsed < seconds - 2 && now >= nextLaunch) {
        launch();
        if (Math.random() < 0.4) launch();
        nextLaunch = now + 350 + Math.random() * 500;
      }

      ctx.clearRect(0, 0, w, h);

      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.y += r.vy * dt;
        r.vy += 400 * dt;
        ctx.beginPath();
        ctx.fillStyle = r.colour;
        ctx.globalAlpha = 0.9;
        ctx.arc(r.x, r.y, 2.2, 0, Math.PI * 2);
        ctx.fill();
        if (r.y <= r.targetY || r.vy >= 0) {
          burst(r);
          rockets.splice(i, 1);
        }
      }

      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life += dt;
        if (s.life >= s.maxLife) {
          sparks.splice(i, 1);
          continue;
        }
        s.vx *= 1 - 1.4 * dt;
        s.vy = s.vy * (1 - 1.4 * dt) + 160 * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        const t = s.life / s.maxLife;
        ctx.globalAlpha = (1 - t) * (t < 0.1 ? t / 0.1 : 1);
        ctx.fillStyle = s.colour;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * (1 - t * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (elapsed < seconds || rockets.length || sparks.length)
        frame = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, w, h);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, [seconds]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-testid="fireworks"
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 900,
      }}
    />
  );
}
