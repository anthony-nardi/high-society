import { Coord, YinshGameState } from "../types";
import { ALL_POINTS, LINES, position, viewBox } from "../board";

export type Highlight =
  "selected" | "target" | "row" | "rowStart" | "removable" | "last";

const SIDE_FILL = { WHITE: "#f1f1f1", BLACK: "#1a1a1a" };
const SIDE_STROKE = { WHITE: "#8a8a8a", BLACK: "#000" };

/** The 85-point board drawn as lines, with rings as hoops and markers as discs. */
export default function Board({
  gameState,
  highlights,
  onClick,
}: {
  gameState: YinshGameState;
  highlights: { [coord: Coord]: Highlight };
  onClick?: (coord: Coord) => void;
}) {
  const box = viewBox();

  return (
    <svg
      viewBox={`${box.minX} ${box.minY} ${box.width} ${box.height}`}
      width="100%"
      style={{ display: "block", maxWidth: 640, margin: "0 auto" }}
      role="group"
      aria-label="YINSH board"
    >
      {/* Board lines */}
      {LINES.map((line, i) => {
        const a = position(line[0]);
        const b = position(line[line.length - 1]);
        return (
          <line
            key={i}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke="#5b5f6a"
            strokeWidth="1.5"
          />
        );
      })}

      {ALL_POINTS.map((coord) => {
        const { x, y } = position(coord);
        const h = highlights[coord];
        const ring = gameState.rings?.[coord];
        const marker = gameState.markers?.[coord];
        const clickable = !!onClick && !!h && h !== "last";
        const label = `${coord}${ring ? ` ${ring.toLowerCase()} ring` : marker ? ` ${marker.toLowerCase()} marker` : " empty"}${h ? ` (${h})` : ""}`;
        return (
          <g
            key={coord}
            onClick={
              clickable || (!!onClick && !ring && !marker)
                ? () => onClick(coord)
                : undefined
            }
            style={{ cursor: clickable ? "pointer" : "default" }}
            role={clickable ? "button" : undefined}
            aria-label={label}
            tabIndex={clickable ? 0 : undefined}
            onKeyDown={(e) => {
              if (clickable && (e.key === "Enter" || e.key === " "))
                onClick(coord);
            }}
          >
            {/* Intersection dot, or a target disc. */}
            <circle
              cx={x}
              cy={y}
              r={h === "target" ? 10 : 3}
              fill={h === "target" ? "rgba(255, 216, 107, 0.55)" : "#8f94a1"}
              stroke={h === "target" ? "#ffd86b" : "none"}
              strokeWidth="2"
            />
            {h === "last" && !ring && (
              <circle
                cx={x}
                cy={y}
                r="14"
                fill="none"
                stroke="#4f8fdc"
                strokeWidth="2"
                opacity="0.8"
              />
            )}
            {marker && (
              <circle
                cx={x}
                cy={y}
                r="12"
                fill={SIDE_FILL[marker]}
                stroke={
                  h === "row" || h === "rowStart"
                    ? "#ff6b6b"
                    : SIDE_STROKE[marker]
                }
                strokeWidth={h === "rowStart" ? 5 : h === "row" ? 3 : 1.5}
              />
            )}
            {ring && (
              <circle
                cx={x}
                cy={y}
                r="18"
                fill="none"
                stroke={
                  h === "selected"
                    ? "#ffd86b"
                    : h === "removable"
                      ? "#ff6b6b"
                      : SIDE_FILL[ring]
                }
                strokeWidth={h === "selected" || h === "removable" ? 8 : 7}
                strokeDasharray={h === "removable" ? "6 4" : undefined}
              />
            )}
            {ring && (
              <circle
                cx={x}
                cy={y}
                r="18"
                fill="none"
                stroke={SIDE_STROKE[ring]}
                strokeWidth="1"
                opacity="0.6"
              />
            )}
            {h === "last" && ring && (
              <circle
                cx={x}
                cy={y}
                r="24"
                fill="none"
                stroke="#4f8fdc"
                strokeWidth="2"
                opacity="0.8"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
