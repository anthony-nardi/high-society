import { useMemo } from "react";
import { ClansGameState, Colour } from "../types";
import {
  centreOf,
  COLOUR_HEX,
  COLOURS,
  countHuts,
  FROZEN_AT,
  hutsAt,
  label,
  LAKES,
  TERRAIN_FILL,
  TERRITORIES,
} from "../board";

export type Highlight = "selectable" | "selected" | "destination" | "founded";

const INK = "#2a2118";
const S = 1 / Math.sqrt(3);
const HEX_POINTS = Array.from({ length: 6 }, (_, i) => {
  const angle = (Math.PI / 180) * (60 * i - 30);
  return `${(Math.cos(angle) * S).toFixed(3)},${(Math.sin(angle) * S).toFixed(3)}`;
}).join(" ");

const cols = Math.max(...TERRITORIES.map((t) => t.col)) + 1;
const rows = Math.max(...TERRITORIES.map((t) => t.row)) + 1;
const CANVAS_W = cols + 0.5;
const CANVAS_H = (rows - 1) * 0.866 + 1;

/** A hut: a little house in its clan's colour. */
function Hut({
  x,
  y,
  colour,
  size = 0.17,
}: {
  x: number;
  y: number;
  colour: Colour;
  size?: number;
}) {
  const h = size;
  return (
    <g transform={`translate(${x} ${y})`} aria-hidden="true">
      <path
        d={`M ${-h / 2} ${h * 0.1} L 0 ${-h * 0.55} L ${h / 2} ${h * 0.1} L ${h / 2} ${h * 0.55} L ${-h / 2} ${h * 0.55} Z`}
        fill={COLOUR_HEX[colour]}
        stroke={colour === "BLACK" ? "#ddd" : INK}
        strokeWidth="0.022"
        strokeLinejoin="round"
      />
    </g>
  );
}

/** Where the huts of a territory sit: a small cluster, counts beyond a few shown as numbers. */
function HutCluster({
  state,
  t,
  moved,
}: {
  state: ClansGameState;
  t: number;
  moved: boolean;
}) {
  const huts = hutsAt(state, t);
  const { x, y } = centreOf(t);
  const entries = COLOURS.filter((c) => (huts[c] ?? 0) > 0).map((c) => ({
    colour: c,
    n: huts[c] as number,
  }));
  const total = countHuts(huts);
  if (!total) return null;
  // One house per colour, laid in a ring, with the count beside it when above one.
  const r = entries.length > 1 ? 0.2 : 0;
  return (
    <g
      className={moved ? "piece-drop" : undefined}
      style={{ transformOrigin: `${x}px ${y}px` }}
    >
      {entries.map(({ colour, n }, i) => {
        const angle = (Math.PI * 2 * i) / entries.length - Math.PI / 2;
        const hx = x + Math.cos(angle) * r;
        const hy = y + Math.sin(angle) * r - 0.02;
        return (
          <g key={colour}>
            <Hut x={hx} y={hy} colour={colour} />
            {n > 1 && (
              <text
                x={hx + 0.11}
                y={hy + 0.12}
                fontSize="0.13"
                fontWeight="800"
                fill="#fff"
                stroke={INK}
                strokeWidth="0.035"
                paintOrder="stroke"
              >
                {n}
              </text>
            )}
          </g>
        );
      })}
      {total >= FROZEN_AT && (
        <text
          x={x}
          y={y + 0.42}
          textAnchor="middle"
          fontSize="0.12"
          fontWeight="800"
          fill={INK}
          opacity="0.75"
        >
          {total} · fixed
        </text>
      )}
    </g>
  );
}

/** The board: hexes by terrain, lakes on their edges, huts, and the villages founded. */
export default function Map({
  gameState,
  highlights,
  onTerritory,
}: {
  gameState: ClansGameState;
  highlights: { [t: number]: Highlight };
  onTerritory?: (t: number) => void;
}) {
  const villages = useMemo(
    () =>
      new globalThis.Map(
        (gameState.villages || []).map((v, i) => [
          v.territory,
          { ...v, number: i + 1 },
        ]),
      ),
    [gameState.villages],
  );
  const last = gameState.lastMove;

  return (
    <svg
      viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
      width="100%"
      style={{
        display: "block",
        maxWidth: 760,
        margin: "0 auto",
        touchAction: "manipulation",
        userSelect: "none",
        WebkitTapHighlightColor: "transparent",
      }}
      role="group"
      aria-label="The Clans board"
    >
      <defs>
        <pattern
          id="clans-forest"
          width="0.3"
          height="0.3"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="0.15" cy="0.15" r="0.06" fill="rgba(0,0,0,0.16)" />
        </pattern>
        <pattern
          id="clans-mountain"
          width="0.4"
          height="0.35"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 0.05 0.3 L 0.2 0.08 L 0.35 0.3 Z"
            fill="rgba(0,0,0,0.14)"
          />
        </pattern>
      </defs>
      <rect
        x="0"
        y="0"
        width={CANVAS_W}
        height={CANVAS_H}
        rx="0.3"
        fill="#9dc3d6"
      />
      {TERRITORIES.map((info, t) => {
        const { x, y } = centreOf(t);
        const h = highlights[t];
        const clickable =
          !!onTerritory &&
          (h === "selectable" || h === "selected" || h === "destination");
        const village = villages.get(t);
        const stroke =
          h === "selected"
            ? "#ffd86b"
            : h === "destination"
              ? "#ff9f43"
              : h === "selectable"
                ? "#ffd86b"
                : h === "founded"
                  ? "#ff6b6b"
                  : "rgba(40,30,20,0.45)";
        const n = countHuts(hutsAt(gameState, t));
        const name = `${label(info.terrain)} ${t}${n ? `, ${n} hut${n === 1 ? "" : "s"}` : village ? `, village ${village.number}` : ", empty"}${h ? ` (${h})` : ""}`;
        return (
          <g
            key={t}
            className={clickable ? "point" : undefined}
            transform={`translate(${x} ${y})`}
            onClick={clickable ? () => onTerritory(t) : undefined}
            style={{ cursor: clickable ? "pointer" : "default" }}
            role={clickable ? "button" : undefined}
            aria-label={name}
            tabIndex={clickable ? 0 : undefined}
            onKeyDown={(e) => {
              if (clickable && (e.key === "Enter" || e.key === " "))
                onTerritory(t);
            }}
          >
            <polygon
              className={clickable ? "target-disc" : undefined}
              points={HEX_POINTS}
              fill={TERRAIN_FILL[info.terrain]}
              stroke={stroke}
              strokeWidth={h ? 0.06 : 0.025}
              strokeDasharray={
                h === "selectable" || h === "destination"
                  ? "0.08 0.05"
                  : undefined
              }
              strokeLinejoin="round"
            />
            {info.terrain === "FOREST" && (
              <polygon
                points={HEX_POINTS}
                fill="url(#clans-forest)"
                aria-hidden="true"
              />
            )}
            {info.terrain === "MOUNTAIN" && (
              <polygon
                points={HEX_POINTS}
                fill="url(#clans-mountain)"
                aria-hidden="true"
              />
            )}
            {h === "founded" && (
              <polygon
                className="row-glow"
                points={HEX_POINTS}
                fill="rgba(255,107,107,0.35)"
                aria-hidden="true"
              />
            )}
            {village && (
              <g aria-hidden="true" opacity="0.8">
                <circle
                  r="0.22"
                  fill="rgba(255,255,255,0.75)"
                  stroke={INK}
                  strokeWidth="0.02"
                />
                <text
                  y="0.05"
                  textAnchor="middle"
                  fontSize="0.18"
                  fontWeight="800"
                  fill={village.destroyed ? "#8d8d8d" : INK}
                >
                  {village.destroyed ? "✕" : village.number}
                </text>
              </g>
            )}
          </g>
        );
      })}
      {/* Lakes: a blue bar along the shared edge. */}
      {LAKES.map(([a, b]) => {
        const p = centreOf(a);
        const q = centreOf(b);
        const mx = (p.x + q.x) / 2;
        const my = (p.y + q.y) / 2;
        const dx = q.x - p.x;
        const dy = q.y - p.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = (-dy / len) * 0.27;
        const ny = (dx / len) * 0.27;
        return (
          <line
            key={`lake-${a}-${b}`}
            x1={mx - nx}
            y1={my - ny}
            x2={mx + nx}
            y2={my + ny}
            stroke="#3b7dd8"
            strokeWidth="0.13"
            strokeLinecap="round"
            aria-hidden="true"
          />
        );
      })}
      {TERRITORIES.map((_, t) => (
        <HutCluster
          key={`huts-${t}`}
          state={gameState}
          t={t}
          moved={last?.to === t}
        />
      ))}
    </svg>
  );
}
