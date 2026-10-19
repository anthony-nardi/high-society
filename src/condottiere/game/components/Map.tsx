import { useState } from "react";
import { CondottiereGameState } from "../types";
import {
  CELLS,
  colourOf,
  controllerOf,
  neighbours,
  OUTLINE,
  REGIONS,
} from "../board";
import displayName from "../../../shared/utils/displayName";
import classes from "../condottiere.module.css";

export type Highlight = "selectable" | "selected" | "battlefield" | "last";

const INK = "#2b1d12";
const SEA = "#b9d0d8";
const LAND = "#f3e8cd";
const DOT = "#7a1f1f";

const points = (poly: [number, number][]) =>
  poly.map(([x, y]) => `${x},${y}`).join(" ");

/** Where each city's name sits, where the default spot would collide with a neighbour. */
const LABEL: {
  [region: number]: { dx?: number; dy?: number; anchor?: "start" | "end" };
} = {
  4: { dy: -3.6 },
  5: { dx: 3.2, dy: 1, anchor: "start" },
  7: { dx: -2.6, dy: 1, anchor: "end" },
  8: { dy: 5.6 },
};

/**
 * A parchment map of Italy on the sea, cut into the seventeen regions.
 * Held regions fly their holder's banner, the battlefield crosses its
 * swords, the Pope keeps his region, and hovering a region shows its
 * neighbours: the ones that would chain with it.
 */
export default function Map({
  gameState,
  highlights,
  onClick,
  small = false,
}: {
  gameState: CondottiereGameState;
  highlights: { [region: number]: Highlight };
  onClick?: (region: number) => void;
  small?: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const near = hover === null ? new Set<number>() : new Set(neighbours(hover));
  const last = gameState.lastBattle;
  const captured =
    gameState.phase === "CHOOSE" && last?.winner !== undefined
      ? last.region
      : undefined;
  const popeKey = `${gameState.pope}:${gameState.notification?.timestamp ?? 0}`;

  return (
    <svg
      viewBox="0 0 104 120"
      className={classes.map}
      style={{ maxWidth: small ? 340 : 540 }}
      role="group"
      aria-label="The map of Italy"
      onMouseLeave={() => setHover(null)}
    >
      <defs>
        <filter id="condottiere-paper" x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="2"
            seed="3"
            result="noise"
          />
          <feColorMatrix
            in="noise"
            type="matrix"
            values="0 0 0 0 0.45  0 0 0 0 0.35  0 0 0 0 0.2  0 0 0 0.08 0"
          />
        </filter>
        <pattern
          id="condottiere-waves"
          width="8"
          height="4"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 0 2 q 2 -1.6 4 0 t 4 0"
            fill="none"
            stroke="rgba(255,255,255,0.35)"
            strokeWidth="0.4"
          />
        </pattern>
      </defs>
      <rect
        x="0"
        y="0"
        width="104"
        height="120"
        rx="2"
        fill={SEA}
        stroke="rgba(0,0,0,0.35)"
        strokeWidth="0.6"
      />
      <rect
        x="0"
        y="0"
        width="104"
        height="120"
        fill="url(#condottiere-waves)"
      />
      <rect
        x="0"
        y="0"
        width="104"
        height="120"
        filter="url(#condottiere-paper)"
        opacity="0.7"
      />
      <text
        x="18"
        y="92"
        fontSize="3"
        fontStyle="italic"
        fill="rgba(30,50,70,0.55)"
        transform="rotate(-50 18 92)"
        style={{ pointerEvents: "none" }}
      >
        Mar Tirreno
      </text>
      <text
        x="86"
        y="42"
        fontSize="3"
        fontStyle="italic"
        fill="rgba(30,50,70,0.55)"
        transform="rotate(62 86 42)"
        style={{ pointerEvents: "none" }}
      >
        Mare Adriatico
      </text>
      {/* Compass */}
      <g
        transform="translate(14 104)"
        opacity="0.7"
        style={{ pointerEvents: "none" }}
      >
        <circle r="6" fill="none" stroke={INK} strokeWidth="0.4" />
        <path d="M 0 -5.5 L 1.4 0 L 0 5.5 L -1.4 0 Z" fill={INK} />
        <path
          d="M -5.5 0 L 0 1.2 L 5.5 0 L 0 -1.2 Z"
          fill={INK}
          opacity="0.5"
        />
        <text
          y="-7"
          textAnchor="middle"
          fontSize="2.6"
          fontWeight="800"
          fill={INK}
        >
          N
        </text>
      </g>
      <polygon
        points={points(OUTLINE)}
        fill={LAND}
        stroke={INK}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />

      {REGIONS.map((info, index) => {
        const h = highlights[index];
        const owner = controllerOf(gameState, index);
        const clickable = !!onClick && (h === "selectable" || h === "selected");
        const isBattle = gameState.battlefield === index;
        const isPope = gameState.pope === index;
        const colour = owner ? colourOf(gameState, owner) : undefined;
        const fill = isBattle
          ? "rgba(255, 107, 107, 0.3)"
          : h === "selectable" || h === "selected"
            ? "rgba(255, 216, 107, 0.35)"
            : colour
              ? `${colour}66`
              : near.has(index)
                ? "rgba(255,255,255,0.45)"
                : "transparent";
        const label = LABEL[index] || {};
        const lx = info.x + (label.dx ?? 0);
        const ly = info.y + (label.dy ?? 5.4);
        const anchor = label.anchor ?? "middle";
        const pillW = info.name.length * 1.45 + 2;
        const pillX =
          anchor === "middle"
            ? lx - pillW / 2
            : anchor === "start"
              ? lx - 1
              : lx - pillW + 1;
        const title = `${info.name}${owner ? `, held by ${displayName(owner)}` : ", unclaimed"}${isPope ? ", the Pope's refuge" : ""}${isBattle ? ", the battlefield" : ""}. Borders ${neighbours(
          index,
        )
          .map((n) => REGIONS[n].name)
          .join(", ")}.`;
        return (
          <g
            key={index}
            className={`point ${clickable ? classes.clickable : ""} ${captured === index ? classes.captured : ""}`}
            onClick={clickable ? () => onClick(index) : undefined}
            onMouseEnter={() => setHover(index)}
            role={clickable ? "button" : undefined}
            aria-label={`${info.name}${owner ? `, held by ${owner}` : ""}${isPope ? ", the Pope" : ""}${isBattle ? ", the battlefield" : ""}${h ? ` (${h})` : ""}`}
            tabIndex={clickable ? 0 : undefined}
            onKeyDown={(e) => {
              if (clickable && (e.key === "Enter" || e.key === " "))
                onClick(index);
            }}
          >
            <title>{title}</title>
            <polygon
              className={`${classes.region} ${clickable ? "target-disc" : ""}`}
              points={points(CELLS[index])}
              fill={fill}
              stroke={
                h === "selected" || h === "selectable"
                  ? "#d9a300"
                  : hover === index
                    ? "#7a1f1f"
                    : INK
              }
              strokeWidth={h || hover === index ? 1.2 : 0.9}
              strokeDasharray={h === "selectable" ? "1.6 1" : undefined}
              strokeLinejoin="round"
            />
            {isBattle && (
              <>
                <circle
                  className={classes.ring}
                  cx={info.x}
                  cy={info.y}
                  r="4"
                  fill="none"
                  stroke="#c0392b"
                  strokeWidth="0.6"
                  aria-hidden="true"
                />
                <text
                  x={info.x}
                  y={info.y + 1.7}
                  textAnchor="middle"
                  fontSize="5"
                  fill="#8c1d1d"
                  style={{ pointerEvents: "none" }}
                >
                  ⚔
                </text>
              </>
            )}
            {owner && colour && (
              <g
                key={`${index}-${owner}`}
                className={classes.banner}
                style={{ pointerEvents: "none" }}
              >
                <line
                  x1={info.x}
                  y1={info.y + 1.5}
                  x2={info.x}
                  y2={info.y - 5}
                  stroke={INK}
                  strokeWidth="0.5"
                />
                <path
                  d={`M ${info.x} ${info.y - 5} L ${info.x + 4.2} ${info.y - 3.8} L ${info.x} ${info.y - 2.4} Z`}
                  fill={colour}
                  stroke={INK}
                  strokeWidth="0.35"
                />
                <circle
                  cx={info.x}
                  cy={info.y + 1.5}
                  r="1.4"
                  fill={colour}
                  stroke={INK}
                  strokeWidth="0.4"
                />
              </g>
            )}
            {!owner && !isBattle && (
              <circle cx={info.x} cy={info.y} r="1.4" fill={DOT} />
            )}
            {isPope && (
              <g
                key={popeKey}
                className={classes.pope}
                style={{ pointerEvents: "none" }}
              >
                <circle
                  cx={info.x + 3.6}
                  cy={info.y - 3}
                  r="3"
                  fill="rgba(109, 63, 143, 0.25)"
                  stroke="#6d3f8f"
                  strokeWidth="0.4"
                />
                <text
                  x={info.x + 3.6}
                  y={info.y - 1.4}
                  textAnchor="middle"
                  fontSize="4.2"
                  fontWeight="800"
                  fill="#4a2c6a"
                >
                  ✝
                </text>
              </g>
            )}
            <rect
              x={pillX}
              y={ly - 2.4}
              width={pillW}
              height="3.2"
              rx="1"
              fill="rgba(247, 238, 216, 0.85)"
              style={{ pointerEvents: "none" }}
            />
            <text
              x={lx}
              y={ly}
              textAnchor={anchor}
              fontSize="2.3"
              fontWeight="700"
              fill={INK}
              style={{ pointerEvents: "none" }}
            >
              {info.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
