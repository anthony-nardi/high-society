import { Coord, ZertzGameState } from "../types";
import { ALL_RINGS, position, RING_RADIUS, viewBox } from "../board";
import { MarbleDefs, MarbleShape } from "./Marble";

export type Highlight = "selected" | "target" | "removable" | "capturer" | "last";

/** The hexagonal board: rings as wooden hoops, marbles on top, highlights for the move. */
export default function Board({
  gameState,
  highlights,
  onClick,
}: {
  gameState: ZertzGameState;
  highlights: { [coord: Coord]: Highlight };
  onClick?: (coord: Coord) => void;
}) {
  const box = viewBox();
  const rings = new Set(gameState.rings);

  const ringStroke = (h?: Highlight) => {
    switch (h) {
      case "removable":
        return "#ff6b6b";
      case "target":
        return "#ffd86b";
      default:
        return "#8d6e63";
    }
  };

  return (
    <svg
      viewBox={`${box.minX} ${box.minY} ${box.width} ${box.height}`}
      width="100%"
      style={{ display: "block", maxWidth: 560, margin: "0 auto" }}
      role="group"
      aria-label="ZÈRTZ board"
    >
      <MarbleDefs />
      {ALL_RINGS.filter((c) => rings.has(c)).map((coord) => {
        const { x, y } = position(coord);
        const h = highlights[coord];
        const marble = gameState.marbles?.[coord];
        const clickable = !!onClick && (h === "target" || h === "removable" || h === "capturer" || h === "selected" || (!marble && !h));
        return (
          <g
            key={coord}
            onClick={clickable ? () => onClick(coord) : undefined}
            style={{ cursor: clickable ? "pointer" : "default" }}
            role={clickable ? "button" : undefined}
            aria-label={`${coord}${marble ? ` ${marble.toLowerCase()} marble` : " empty ring"}${h ? ` (${h})` : ""}`}
            tabIndex={clickable ? 0 : undefined}
            onKeyDown={(e) => {
              if (clickable && (e.key === "Enter" || e.key === " ")) onClick(coord);
            }}
          >
            {/* Ring: a hoop with a hole, so the table shows through. */}
            <circle cx={x + 2} cy={y + 3} r={RING_RADIUS} fill="none" stroke="#000" strokeWidth="8" opacity="0.35" />
            <circle
              cx={x}
              cy={y}
              r={RING_RADIUS}
              fill={h === "target" ? "rgba(255, 216, 107, 0.18)" : h === "removable" ? "rgba(255, 107, 107, 0.16)" : "rgba(0, 0, 0, 0.25)"}
              stroke={ringStroke(h)}
              strokeWidth={h === "target" || h === "removable" ? 6 : 7}
              strokeDasharray={h === "removable" ? "6 5" : undefined}
            />
            {h === "last" && (
              <circle cx={x} cy={y} r={RING_RADIUS + 6} fill="none" stroke="#4f8fdc" strokeWidth="2" opacity="0.8" />
            )}
            {marble && (
              <MarbleShape
                colour={marble}
                x={x}
                y={y}
                r={RING_RADIUS - 5}
                highlighted={h === "selected" || h === "capturer"}
              />
            )}
            {h === "capturer" && !marble && null}
          </g>
        );
      })}
    </svg>
  );
}
