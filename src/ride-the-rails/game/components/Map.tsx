import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Railroad, RideTheRailsGameState } from "../types";
import {
  centreOf,
  cityName,
  COLOURS,
  HEXES,
  MAP_HEIGHT,
  MAP_WIDTH,
  neighbours,
  RAILROADS,
  railroadsIn,
  ridableCities,
  trackOf,
} from "../board";
import classes from "../rails.module.css";

export type Highlight = "selectable" | "selected" | "route" | "last";

export type Leg = { railroad: Railroad; hexes: number[] };

const INK = "#2a2118";
const WATER = "#9dc3d6";
const LAND = "#efe3c4";
const MOUNTAIN = "#c9b48d";

/** Size of a hex: one unit wide on the board canvas. */
const S = 1 / Math.sqrt(3); // circumradius for a width of 1
const HEX_POINTS = Array.from({ length: 6 }, (_, i) => {
  const angle = (Math.PI / 180) * (60 * i - 30);
  return `${(Math.cos(angle) * S).toFixed(3)},${(Math.sin(angle) * S).toFixed(3)}`;
}).join(" ");

const CANVAS_W = MAP_WIDTH + 0.5;
const CANVAS_H = (MAP_HEIGHT - 1) * 0.866 + 1;
const RATIO = CANVAS_H / CANVAS_W;
const MIN_W = CANVAS_W / 5;
const MAX_W = CANVAS_W;

/** Cities whose name sits somewhere other than below, so neighbours do not collide. */
const LABEL_ABOVE = new Set([
  "Boston",
  "Pittsburgh",
  "San Antonio",
  "Kansas City",
  "Memphis",
  "Detroit",
]);
const LABEL_RIGHT = new Set(["New York"]);

type View = { x: number; y: number; w: number };
const FIT: View = { x: 0, y: 0, w: CANVAS_W };

function clampView(v: View): View {
  const w = Math.min(MAX_W, Math.max(MIN_W, v.w));
  const h = w * RATIO;
  const x =
    w >= CANVAS_W
      ? (CANVAS_W - w) / 2
      : Math.min(CANVAS_W - w + 0.5, Math.max(-0.5, v.x));
  const y =
    h >= CANVAS_H
      ? (CANVAS_H - h) / 2
      : Math.min(CANVAS_H - h + 0.5, Math.max(-0.5, v.y));
  return { x, y, w };
}

function Passenger({ x, y, dim }: { x: number; y: number; dim?: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`} opacity={dim ? 0.35 : 1}>
      <circle r="0.14" cy="-0.16" fill="#fff" stroke={INK} strokeWidth="0.03" />
      <path
        d="M -0.17 0.2 Q 0 -0.1 0.17 0.2 Z"
        fill="#fff"
        stroke={INK}
        strokeWidth="0.03"
      />
    </g>
  );
}

/**
 * The map: hexes, cities, passengers and every railroad's track. Drag to
 * pan, pinch or ctrl-wheel to zoom, with buttons for the rest.
 */
export default function Map({
  gameState,
  highlights,
  onHex,
  legs,
  replayKey,
}: {
  gameState: RideTheRailsGameState;
  highlights: { [hex: number]: Highlight };
  onHex?: (hex: number) => void;
  /** The journey being planned or just made, one trail per leg. */
  legs?: Leg[];
  /** Changes when a new ride should be replayed along its trail. */
  replayKey?: string;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [view, setView] = useState<View>(FIT);
  const pointers = useRef(
    new globalThis.Map<number, { x: number; y: number }>(),
  );
  const gesture = useRef<{
    view: View;
    centre: { x: number; y: number };
    distance: number;
  } | null>(null);
  const dragged = useRef(false);

  // Phones start zoomed in on the east coast, where the first rounds happen.
  useEffect(() => {
    const width = frameRef.current?.clientWidth ?? 1000;
    if (width < 640) {
      const w = CANVAS_W / 2.4;
      setView(clampView({ x: CANVAS_W - w + 0.5, y: 1.6, w }));
    }
  }, []);

  const zoomAt = useCallback(
    (factor: number, clientX?: number, clientY?: number) => {
      setView((v) => {
        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect || !rect.width) return v;
        const px = clientX === undefined ? rect.width / 2 : clientX - rect.left;
        const py = clientY === undefined ? rect.height / 2 : clientY - rect.top;
        const scale = v.w / rect.width;
        const mapX = v.x + px * scale;
        const mapY = v.y + py * scale;
        const w = Math.min(MAX_W, Math.max(MIN_W, v.w / factor));
        const newScale = w / rect.width;
        return clampView({
          x: mapX - px * newScale,
          y: mapY - py * newScale,
          w,
        });
      });
    },
    [],
  );

  // Wheel zoom needs a non-passive listener to stop the page scrolling.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomAt(e.deltaY < 0 ? 1.2 : 1 / 1.2, e.clientX, e.clientY);
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    const centre = {
      x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
      y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
    };
    const distance =
      pts.length >= 2
        ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
        : 0;
    gesture.current = { view, centre, distance };
    if (pts.length === 1) dragged.current = false;
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    const start = gesture.current;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || !rect.width) return;
    const centre = {
      x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
      y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
    };
    const moved = Math.hypot(
      centre.x - start.centre.x,
      centre.y - start.centre.y,
    );
    if (moved > 6) dragged.current = true;
    const startScale = start.view.w / rect.width;
    let w = start.view.w;
    if (pts.length >= 2 && start.distance > 0) {
      const distance = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      w = Math.min(
        MAX_W,
        Math.max(MIN_W, start.view.w * (start.distance / distance)),
      );
      dragged.current = true;
    }
    const scale = w / rect.width;
    // The map point under the gesture's start stays under the fingers.
    const mapX = start.view.x + (start.centre.x - rect.left) * startScale;
    const mapY = start.view.y + (start.centre.y - rect.top) * startScale;
    setView(
      clampView({
        x: mapX - (centre.x - rect.left) * scale,
        y: mapY - (centre.y - rect.top) * scale,
        w,
      }),
    );
  };

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) gesture.current = null;
    else {
      // Re-anchor the remaining finger so the map does not jump.
      const pts = [...pointers.current.values()];
      gesture.current = {
        view,
        centre: { x: pts[0].x, y: pts[0].y },
        distance: 0,
      };
    }
  };

  const tap = (hex: number) => {
    if (dragged.current) return;
    onHex?.(hex);
  };

  // Rails: a stroke between each pair of neighbouring hexes a railroad occupies.
  const rails = useMemo(() => {
    const out: { railroad: Railroad; a: number; b: number }[] = [];
    for (const railroad of RAILROADS) {
      const track = trackOf(gameState, railroad);
      const set = new Set(track);
      for (const hex of track)
        for (const n of neighbours(hex))
          if (n > hex && set.has(n)) out.push({ railroad, a: hex, b: n });
    }
    return out;
  }, [gameState]);

  const ridable = useMemo(() => new Set(ridableCities(gameState)), [gameState]);
  const last =
    gameState.lastMove?.type === "build" ? gameState.lastMove.hex : undefined;

  const replayPath = useMemo(() => {
    if (!replayKey || !legs?.length) return null;
    const hexes = legs.flatMap((l, i) =>
      i === 0 ? l.hexes : l.hexes.slice(1),
    );
    return hexes
      .map((h, i) => {
        const c = centreOf(h);
        return `${i === 0 ? "M" : "L"} ${c.x.toFixed(3)} ${c.y.toFixed(3)}`;
      })
      .join(" ");
  }, [legs, replayKey]);
  const replayHexes = legs
    ? legs.reduce(
        (n, l, i) => n + (i === 0 ? l.hexes.length : l.hexes.length - 1),
        0,
      )
    : 0;

  const h = view.w * RATIO;

  return (
    <div ref={frameRef} className={classes.mapFrame}>
      <div className={classes.zoomButtons} aria-label="Zoom">
        <button type="button" onClick={() => zoomAt(1.4)} aria-label="Zoom in">
          +
        </button>
        <button
          type="button"
          onClick={() => zoomAt(1 / 1.4)}
          aria-label="Zoom out"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => setView(FIT)}
          aria-label="Fit the whole map"
          style={{ fontSize: 12 }}
        >
          Fit
        </button>
      </div>
      <svg
        ref={svgRef}
        viewBox={`${view.x} ${view.y} ${view.w} ${h}`}
        style={{
          display: "block",
          width: "100%",
          touchAction: "none",
          userSelect: "none",
          WebkitTapHighlightColor: "transparent",
          background: WATER,
          cursor: "grab",
        }}
        role="group"
        aria-label="The map of the United States"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {HEXES.map((info, hex) => {
          if (!info.land) return null;
          const { x, y } = centreOf(hex);
          const hl = highlights[hex];
          const clickable =
            !!onHex && (hl === "selectable" || hl === "selected");
          const here = railroadsIn(gameState, hex);
          const fill =
            hl === "selected"
              ? "#ffd86b"
              : hl === "selectable"
                ? info.mountain
                  ? "#f0cf8e"
                  : "#fff1b8"
                : info.mountain
                  ? MOUNTAIN
                  : LAND;
          const stroke =
            hl === "selectable" && info.mountain
              ? "#b5651d"
              : hl === "selectable" || hl === "selected"
                ? "#c99700"
                : "rgba(60,40,20,0.35)";
          const name = info.city
            ? `${info.city}${here.length ? `, ${here.map((r) => r.toLowerCase()).join(" and ")}` : ""}`
            : `${info.mountain ? "mountain" : "country"} hex ${hex}${here.length ? `, ${here.map((r) => r.toLowerCase()).join(" and ")}` : ""}`;
          return (
            <g
              key={hex}
              className="point"
              transform={`translate(${x} ${y})`}
              onClick={clickable ? () => tap(hex) : undefined}
              style={{ cursor: clickable ? "pointer" : undefined }}
              role={clickable ? "button" : undefined}
              aria-label={`${name}${hl ? ` (${hl}${hl === "selectable" && info.mountain ? ", costs a placement" : ""})` : ""}`}
              tabIndex={clickable ? 0 : undefined}
              onKeyDown={(e) => {
                if (clickable && (e.key === "Enter" || e.key === " "))
                  onHex?.(hex);
              }}
            >
              <polygon
                className={clickable ? "target-disc" : undefined}
                points={HEX_POINTS}
                fill={fill}
                stroke={stroke}
                strokeWidth={hl ? 0.05 : 0.025}
                strokeDasharray={hl === "selectable" ? "0.08 0.05" : undefined}
                strokeLinejoin="round"
              />
              {info.mountain && (
                <path
                  d="M -0.28 0.16 L -0.12 -0.14 L 0 0.02 L 0.1 -0.18 L 0.28 0.16 Z"
                  fill="#a68b5b"
                  stroke="#6b5635"
                  strokeWidth="0.025"
                  aria-hidden="true"
                />
              )}
            </g>
          );
        })}

        {/* Rails, drawn above the hexes and below the cities. */}
        {rails.map(({ railroad, a, b }, i) => {
          const p = centreOf(a);
          const q = centreOf(b);
          const offset = (RAILROADS.indexOf(railroad) - 2.5) * 0.045;
          const dx = q.x - p.x;
          const dy = q.y - p.y;
          const len = Math.hypot(dx, dy) || 1;
          const nx = (-dy / len) * offset;
          const ny = (dx / len) * offset;
          return (
            <line
              key={`${railroad}-${i}`}
              x1={p.x + nx}
              y1={p.y + ny}
              x2={q.x + nx}
              y2={q.y + ny}
              stroke={COLOURS[railroad]}
              strokeWidth="0.11"
              strokeLinecap="round"
              aria-hidden="true"
            />
          );
        })}

        {/* The journey trail, one colour per leg, numbered at each change. */}
        {legs?.map((leg, i) => {
          const points = leg.hexes
            .map((hx) => {
              const c = centreOf(hx);
              return `${c.x},${c.y}`;
            })
            .join(" ");
          const end = centreOf(leg.hexes[leg.hexes.length - 1]);
          return (
            <g key={`leg-${i}`} aria-hidden="true">
              <polyline
                points={points}
                fill="none"
                stroke="#fff"
                strokeWidth="0.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.9"
              />
              <polyline
                points={points}
                fill="none"
                stroke={COLOURS[leg.railroad]}
                strokeWidth="0.11"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="0.18 0.1"
              />
              <circle
                cx={end.x - 0.3}
                cy={end.y - 0.3}
                r="0.14"
                fill={COLOURS[leg.railroad]}
                stroke="#fff"
                strokeWidth="0.03"
              />
              <text
                x={end.x - 0.3}
                y={end.y - 0.245}
                textAnchor="middle"
                fontSize="0.16"
                fontWeight="800"
                fill={leg.railroad === "YELLOW" ? "#222" : "#fff"}
              >
                {i + 1}
              </text>
            </g>
          );
        })}

        {/* Locomotives in each occupied hex. */}
        {HEXES.map((info, hex) => {
          if (!info.land) return null;
          const here = railroadsIn(gameState, hex);
          if (!here.length) return null;
          const { x, y } = centreOf(hex);
          const size = here.length > 2 ? 0.13 : 0.19;
          const start = -((here.length - 1) * (size + 0.03)) / 2;
          return (
            <g key={`loco-${hex}`} aria-hidden="true">
              {here.map((railroad, i) => (
                <rect
                  key={railroad}
                  className={
                    last === hex && i === here.length - 1
                      ? "piece-drop"
                      : undefined
                  }
                  x={x + start + i * (size + 0.03) - size / 2}
                  y={y + (info.city ? 0.08 : -size / 2)}
                  width={size}
                  height={size}
                  rx={0.04}
                  fill={COLOURS[railroad]}
                  stroke="#fff"
                  strokeWidth="0.03"
                />
              ))}
            </g>
          );
        })}

        {/* Cities, names and passengers. */}
        {HEXES.map((info, hex) => {
          if (!info.city) return null;
          const { x, y } = centreOf(hex);
          const kind = info.kind;
          const ring =
            kind === "EAST"
              ? "#d64545"
              : kind === "WEST"
                ? "#8e5bc7"
                : kind === "CHICAGO"
                  ? "#c99700"
                  : kind === "BONUS"
                    ? "#2e8b57"
                    : INK;
          const passenger = (gameState.passengers || []).includes(hex);
          const above = LABEL_ABOVE.has(info.city);
          const right = LABEL_RIGHT.has(info.city);
          return (
            <g
              key={`city-${hex}`}
              style={{ pointerEvents: "none" }}
              aria-hidden="true"
            >
              <circle
                cx={x}
                cy={y - 0.06}
                r={kind === "CHICAGO" ? 0.27 : 0.22}
                fill="#fff"
                stroke={ring}
                strokeWidth={kind === "PLAIN" ? 0.04 : 0.07}
              />
              {kind === "EAST" && (
                <circle
                  cx={x}
                  cy={y - 0.06}
                  r={0.11}
                  fill="none"
                  stroke="#3b7dd8"
                  strokeWidth="0.05"
                />
              )}
              {kind === "WEST" && (
                <circle
                  cx={x}
                  cy={y - 0.06}
                  r={0.11}
                  fill="none"
                  stroke="#2b2b2b"
                  strokeWidth="0.05"
                />
              )}
              {kind === "BONUS" && (
                <text
                  x={x}
                  y={y - 0.01}
                  textAnchor="middle"
                  fontSize="0.17"
                  fontWeight="800"
                  fill="#2e8b57"
                >
                  $5
                </text>
              )}
              {kind === "CHICAGO" && (
                <text
                  x={x}
                  y={y}
                  textAnchor="middle"
                  fontSize="0.2"
                  fontWeight="800"
                  fill="#c99700"
                >
                  ★
                </text>
              )}
              {passenger && (
                <Passenger x={x + 0.26} y={y - 0.2} dim={!ridable.has(hex)} />
              )}
              <text
                x={right ? x + 0.3 : x}
                y={above ? y - 0.36 : right ? y - 0.01 : y + 0.42}
                textAnchor={right ? "start" : "middle"}
                fontSize="0.2"
                fontWeight="700"
                fill={INK}
                stroke="rgba(255,255,255,0.85)"
                strokeWidth="0.05"
                paintOrder="stroke"
              >
                {cityName(hex)}
              </text>
            </g>
          );
        })}

        {/* A passenger riding along the last journey. */}
        {replayPath && (
          <g
            key={replayKey}
            aria-hidden="true"
            style={{ pointerEvents: "none" }}
          >
            <g>
              <circle
                r="0.16"
                cy="-0.1"
                fill="#fff"
                stroke={INK}
                strokeWidth="0.03"
              />
              <path
                d="M -0.2 0.3 Q 0 -0.05 0.2 0.3 Z"
                fill="#ffd86b"
                stroke={INK}
                strokeWidth="0.03"
              />
              <animateMotion
                dur={`${Math.max(1.2, replayHexes * 0.3)}s`}
                fill="freeze"
                path={replayPath}
                calcMode="linear"
              />
            </g>
          </g>
        )}
      </svg>
      <div className={classes.hint} aria-hidden="true">
        drag to pan · pinch or ctrl+scroll to zoom
      </div>
    </div>
  );
}
