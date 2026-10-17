import { ShangriLaGameState } from "../types";
import {
  ALL_BRIDGES,
  COLOUR_FILL,
  hasBridge,
  MASTER_MARK,
  MASTERS,
  strengthOf,
  VILLAGES,
} from "../board";
import BoardSurface from "../../../shared/components/BoardSurface";

export type Highlight = "selectable" | "selected" | "target" | "last";

const BOX = { minX: 0, minY: 0, width: 100, height: 100 };
const SLOT = 2.6;
/** Slot offsets around a village: four above, three below. */
const SLOT_OFFSETS: [number, number][] = [
  [-4.2, -2.2],
  [-1.4, -2.2],
  [1.4, -2.2],
  [4.2, -2.2],
  [-2.8, 0.8],
  [0, 0.8],
  [2.8, 0.8],
];

function colourOf(state: ShangriLaGameState, email: string) {
  return COLOUR_FILL[
    state.players.find((p) => p.email === email)?.colour ?? "RED"
  ];
}

/** The map: villages as plaques with seven discipline slots, bridges as ropes. */
export default function Board({
  gameState,
  highlights,
  onClick,
}: {
  gameState: ShangriLaGameState;
  highlights: { [village: number]: Highlight };
  onClick?: (village: number) => void;
}) {
  const bridges = gameState.bridges || [];
  const last = gameState.lastMove;
  const moveKey = `${gameState.turn}:${last?.type}:${last?.village}:${last?.to}`;

  return (
    <svg
      viewBox="0 0 100 100"
      width="100%"
      style={{
        display: "block",
        maxWidth: 720,
        margin: "0 auto",
        touchAction: "manipulation",
        userSelect: "none",
        WebkitTapHighlightColor: "transparent",
      }}
      role="group"
      aria-label="The villages of Shangri-La"
    >
      <BoardSurface id="shangri" box={BOX} radius={6} />

      {/* Broken paths stay as faint traces; standing bridges are ropes. */}
      {ALL_BRIDGES.map(([a, b]) => {
        const standing = hasBridge(bridges, a, b);
        const va = VILLAGES[a];
        const vb = VILLAGES[b];
        const isLast =
          last?.type === "journey" &&
          ((last.village === a && last.to === b) ||
            (last.village === b && last.to === a));
        return (
          <g key={`${a}-${b}`}>
            <line
              x1={va.x}
              y1={va.y}
              x2={vb.x}
              y2={vb.y}
              stroke={standing ? "#c9a46b" : "rgba(0,0,0,0.35)"}
              strokeWidth={standing ? 1.1 : 0.5}
              strokeDasharray={standing ? "1.6 0.9" : "0.8 1.2"}
              strokeLinecap="round"
            />
            {isLast && (
              <line
                key={`trail-${moveKey}`}
                className="trail"
                x1={va.x}
                y1={va.y}
                x2={vb.x}
                y2={vb.y}
                stroke="#4f8fdc"
                strokeWidth="1.4"
                strokeDasharray="2 1.2"
                strokeLinecap="round"
                aria-hidden="true"
              />
            )}
          </g>
        );
      })}

      {VILLAGES.map((info, index) => {
        const village = gameState.villages[index];
        const h = highlights[index];
        const clickable = !!onClick && !!h && h !== "last";
        const strength = strengthOf(village);
        const ring =
          h === "selected"
            ? "#ffd86b"
            : h === "target"
              ? "#ffd86b"
              : h === "selectable"
                ? "rgba(255, 216, 107, 0.7)"
                : "rgba(0,0,0,0.6)";
        const justChanged = last?.village === index || last?.to === index;
        return (
          <g
            key={index}
            className="point"
            onClick={clickable ? () => onClick(index) : undefined}
            style={{ cursor: clickable ? "pointer" : "default" }}
            role={clickable ? "button" : undefined}
            aria-label={`${info.name}${village.stone ? " (at peace)" : ""}, strength ${strength}${h ? ` (${h})` : ""}`}
            tabIndex={clickable ? 0 : undefined}
            onKeyDown={(e) => {
              if (clickable && (e.key === "Enter" || e.key === " "))
                onClick(index);
            }}
          >
            <rect
              x={info.x - 7}
              y={info.y - 4.6}
              width="14"
              height="8.4"
              rx="1.6"
              fill="#000"
              opacity="0.4"
              transform="translate(0.4 0.5)"
            />
            <rect
              x={info.x - 7}
              y={info.y - 4.6}
              width="14"
              height="8.4"
              rx="1.6"
              fill={village.stone ? "#6f6a60" : "#f1e4c6"}
              stroke={ring}
              strokeWidth={h === "selected" || h === "target" ? 0.9 : 0.45}
              strokeDasharray={h === "target" ? "1 0.6" : undefined}
            />
            {h === "target" && (
              <rect
                className="target-disc"
                x={info.x - 8.2}
                y={info.y - 5.8}
                width="16.4"
                height="10.8"
                rx="2.2"
                fill="rgba(255, 216, 107, 0.2)"
                stroke="#ffd86b"
                strokeWidth="0.5"
              />
            )}
            {MASTERS.map((type, i) => {
              const [dx, dy] = SLOT_OFFSETS[i];
              const space = village.spaces?.[type];
              const cx = info.x + dx;
              const cy = info.y + dy;
              return (
                <g
                  key={type}
                  className={
                    space && justChanged ? "piece piece-drop" : undefined
                  }
                  style={
                    space && justChanged
                      ? { animationDelay: `${i * 40}ms` }
                      : undefined
                  }
                >
                  <circle
                    cx={cx}
                    cy={cy}
                    r={SLOT / 2}
                    fill={
                      space
                        ? colourOf(gameState, space.owner)
                        : "rgba(0,0,0,0.12)"
                    }
                    stroke={space ? "#222" : "rgba(0,0,0,0.35)"}
                    strokeWidth="0.25"
                  />
                  {space?.student && (
                    <circle
                      cx={cx + 0.9}
                      cy={cy - 0.9}
                      r="0.7"
                      fill="#fff"
                      stroke="#222"
                      strokeWidth="0.2"
                    />
                  )}
                  <text
                    x={cx}
                    y={cy + 0.6}
                    textAnchor="middle"
                    fontSize="1.6"
                    fontWeight="700"
                    fill={space ? "#fff" : "rgba(0,0,0,0.5)"}
                    style={{ pointerEvents: "none" }}
                  >
                    {MASTER_MARK[type]}
                  </text>
                </g>
              );
            })}
            {village.stone && (
              <g aria-hidden="true">
                <circle
                  cx={info.x + 5.2}
                  cy={info.y - 3.2}
                  r="1.5"
                  fill="#9fb8c8"
                  stroke="#2c3e50"
                  strokeWidth="0.3"
                />
              </g>
            )}
            <text
              x={info.x}
              y={info.y + 6.9}
              textAnchor="middle"
              fontSize="2.3"
              fontWeight="700"
              fill="#f6edd0"
              style={{ pointerEvents: "none" }}
            >
              {info.name}
            </text>
            <text
              x={info.x + 6.2}
              y={info.y + 6.9}
              textAnchor="start"
              fontSize="1.8"
              fill="#f6edd0"
              opacity="0.8"
              style={{ pointerEvents: "none" }}
            >
              {strength}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
