import { CondottiereGameState } from "../types";
import { CELLS, colourOf, controllerOf, OUTLINE, REGIONS } from "../board";

export type Highlight = "selectable" | "selected" | "battlefield" | "last";

const INK = "#2b1d12";
const PARCHMENT = "#efe0bf";
const LAND = "#f7eed8";
const DOT = "#7a1f1f";

const points = (poly: [number, number][]) =>
  poly.map(([x, y]) => `${x},${y}`).join(" ");

/** A parchment map of Italy cut into regions, each with one dot: the control marker. */
export default function Map({
  gameState,
  highlights,
  onClick,
}: {
  gameState: CondottiereGameState;
  highlights: { [region: number]: Highlight };
  onClick?: (region: number) => void;
}) {
  return (
    <svg
      viewBox="0 0 104 120"
      width="100%"
      style={{
        display: "block",
        maxWidth: 520,
        margin: "0 auto",
        touchAction: "manipulation",
        userSelect: "none",
        WebkitTapHighlightColor: "transparent",
      }}
      role="group"
      aria-label="The map of Italy"
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
      </defs>
      <rect
        x="0"
        y="0"
        width="104"
        height="120"
        rx="2"
        fill={PARCHMENT}
        stroke="rgba(0,0,0,0.35)"
        strokeWidth="0.6"
      />
      <rect
        x="0"
        y="0"
        width="104"
        height="120"
        filter="url(#condottiere-paper)"
        opacity="0.7"
      />
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
          ? "rgba(255, 107, 107, 0.28)"
          : h === "selectable" || h === "selected"
            ? "rgba(255, 216, 107, 0.3)"
            : colour
              ? `${colour}55`
              : "transparent";
        return (
          <g
            key={index}
            className="point"
            onClick={clickable ? () => onClick(index) : undefined}
            style={{ cursor: clickable ? "pointer" : "default" }}
            role={clickable ? "button" : undefined}
            aria-label={`${info.name}${owner ? `, held by ${owner}` : ""}${isPope ? ", the Pope" : ""}${isBattle ? ", the battlefield" : ""}${h ? ` (${h})` : ""}`}
            tabIndex={clickable ? 0 : undefined}
            onKeyDown={(e) => {
              if (clickable && (e.key === "Enter" || e.key === " "))
                onClick(index);
            }}
          >
            <polygon
              className={clickable ? "target-disc" : undefined}
              points={points(CELLS[index])}
              fill={fill}
              stroke={
                h === "selected"
                  ? "#d9a300"
                  : h === "selectable"
                    ? "#d9a300"
                    : INK
              }
              strokeWidth={h ? 1.2 : 0.9}
              strokeDasharray={h === "selectable" ? "1.6 1" : undefined}
              strokeLinejoin="round"
            />
            {isBattle && (
              <circle
                className="row-glow"
                cx={info.x}
                cy={info.y}
                r="4.5"
                fill="rgba(255,107,107,0.25)"
                stroke="#c0392b"
                strokeWidth="0.5"
                aria-hidden="true"
              />
            )}
            {owner && (
              <circle
                cx={info.x}
                cy={info.y}
                r="2.6"
                fill={colour}
                stroke={INK}
                strokeWidth="0.5"
              />
            )}
            {!owner && <circle cx={info.x} cy={info.y} r="1.5" fill={DOT} />}
            {isPope && (
              <text
                x={info.x + 3.2}
                y={info.y - 2}
                fontSize="4.2"
                fontWeight="800"
                fill="#4a2c6a"
                style={{ pointerEvents: "none" }}
              >
                ✝
              </text>
            )}
            <text
              x={info.x}
              y={info.y + 5.4}
              textAnchor="middle"
              fontSize="2.4"
              fontWeight="700"
              fill={INK}
              opacity="0.8"
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
