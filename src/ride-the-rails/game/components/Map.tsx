import { useMemo } from "react";
import { Railroad, RideTheRailsGameState } from "../types";
import {
  centreOf,
  COLOURS,
  HEXES,
  MAP_HEIGHT,
  MAP_WIDTH,
  neighbours,
  RAILROADS,
  railroadsIn,
  trackOf,
} from "../board";

export type Highlight = "selectable" | "selected" | "route" | "last";

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

function Passenger({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} aria-hidden="true">
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

/** The map: hexes, cities, passengers and every railroad's track. */
export default function Map({
  gameState,
  highlights,
  onHex,
  routeHexes,
}: {
  gameState: RideTheRailsGameState;
  highlights: { [hex: number]: Highlight };
  onHex?: (hex: number) => void;
  /** The journey being planned or just made, drawn as a trail. */
  routeHexes?: number[];
}) {
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

  const last =
    gameState.lastMove?.type === "build" ? gameState.lastMove.hex : undefined;

  return (
    <div
      style={{
        width: "100%",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
        borderRadius: 12,
      }}
    >
      <svg
        viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
        style={{
          display: "block",
          minWidth: 900,
          width: "100%",
          maxWidth: 1100,
          margin: "0 auto",
          touchAction: "manipulation",
          userSelect: "none",
          WebkitTapHighlightColor: "transparent",
          background: WATER,
          borderRadius: 12,
        }}
        role="group"
        aria-label="The map of the United States"
      >
        {HEXES.map((info, hex) => {
          if (!info.land) return null;
          const { x, y } = centreOf(hex);
          const h = highlights[hex];
          const clickable = !!onHex && (h === "selectable" || h === "selected");
          const here = railroadsIn(gameState, hex);
          const fill =
            h === "selected"
              ? "#ffd86b"
              : h === "selectable"
                ? "#fff1b8"
                : info.mountain
                  ? MOUNTAIN
                  : LAND;
          const name = info.city
            ? `${info.city}${here.length ? `, ${here.map((r) => r.toLowerCase()).join(" and ")}` : ""}`
            : `${info.mountain ? "mountain" : "country"} hex ${hex}${here.length ? `, ${here.map((r) => r.toLowerCase()).join(" and ")}` : ""}`;
          return (
            <g
              key={hex}
              className="point"
              transform={`translate(${x} ${y})`}
              onClick={clickable ? () => onHex(hex) : undefined}
              style={{ cursor: clickable ? "pointer" : "default" }}
              role={clickable ? "button" : undefined}
              aria-label={`${name}${h ? ` (${h})` : ""}`}
              tabIndex={clickable ? 0 : undefined}
              onKeyDown={(e) => {
                if (clickable && (e.key === "Enter" || e.key === " "))
                  onHex(hex);
              }}
            >
              <polygon
                className={clickable ? "target-disc" : undefined}
                points={HEX_POINTS}
                fill={fill}
                stroke={
                  h === "selectable" || h === "selected"
                    ? "#c99700"
                    : "rgba(60,40,20,0.35)"
                }
                strokeWidth={h ? 0.05 : 0.025}
                strokeDasharray={h === "selectable" ? "0.08 0.05" : undefined}
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

        {/* The journey trail. */}
        {routeHexes && routeHexes.length > 1 && (
          <polyline
            className="trail"
            points={routeHexes
              .map((h) => {
                const c = centreOf(h);
                return `${c.x},${c.y}`;
              })
              .join(" ")}
            fill="none"
            stroke="#fff"
            strokeWidth="0.09"
            strokeDasharray="0.12 0.1"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          />
        )}

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
              {passenger && <Passenger x={x + 0.26} y={y - 0.2} />}
              <text
                x={x}
                y={y + 0.42}
                textAnchor="middle"
                fontSize="0.2"
                fontWeight="700"
                fill={INK}
                stroke="rgba(255,255,255,0.8)"
                strokeWidth="0.04"
                paintOrder="stroke"
              >
                {info.city}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
