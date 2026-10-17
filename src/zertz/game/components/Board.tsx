import { CSSProperties } from "react";
import { Coord, ZertzGameState } from "../types";
import { ALL_RINGS, position, RING_RADIUS, viewBox } from "../board";
import { MarbleDefs, MarbleShape } from "./Marble";

export type Highlight =
  "selected" | "target" | "removable" | "capturer" | "last";

/** CSS variables telling an animation where a piece came from. */
function offsetFrom(from: Coord, to: Coord): CSSProperties {
  const a = position(from);
  const b = position(to);
  return {
    "--dx": `${a.x - b.x}px`,
    "--dy": `${a.y - b.y}px`,
  } as CSSProperties;
}

/** The ring a marble jumped over on its way from one ring to another. */
function between(from: Coord, to: Coord): Coord {
  const [fx, fy] = from.split(",").map(Number);
  const [tx, ty] = to.split(",").map(Number);
  return `${(fx + tx) / 2},${(fy + ty) / 2}`;
}

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
  const last = gameState.lastMove;
  // Remounting the animated pieces on each new move restarts their animation.
  const moveKey = `${gameState.turn}:${last?.type}:${last?.from}:${last?.to}`;

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

  const ghosts: React.ReactNode[] = [];
  if (last?.type === "remove" && last.from && !rings.has(last.from)) {
    const { x, y } = position(last.from);
    ghosts.push(
      <g
        key={`ring-${moveKey}`}
        className="piece piece-lift"
        aria-hidden="true"
      >
        <circle
          cx={x}
          cy={y}
          r={RING_RADIUS}
          fill="none"
          stroke="#8d6e63"
          strokeWidth="7"
        />
      </g>,
    );
  }
  if (last?.type === "capture" && last.from && last.to && last.colour) {
    const { x, y } = position(between(last.from, last.to));
    ghosts.push(
      <g
        key={`taken-${moveKey}`}
        className="piece piece-lift"
        style={{ animationDelay: "180ms" }}
        aria-hidden="true"
      >
        <MarbleShape colour={last.colour} x={x} y={y} r={RING_RADIUS - 5} />
      </g>,
    );
  }

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
        const clickable =
          !!onClick &&
          (h === "target" ||
            h === "removable" ||
            h === "capturer" ||
            h === "selected" ||
            (!marble && !h));
        const isLanding = !!marble && last?.to === coord;
        const animation =
          isLanding && last?.type === "capture" && last.from
            ? {
                key: `jump-${moveKey}`,
                className: "piece piece-jump",
                style: offsetFrom(last.from, coord),
              }
            : isLanding && last?.type === "place"
              ? {
                  key: `drop-${moveKey}`,
                  className: "piece piece-drop",
                  style: undefined,
                }
              : null;
        return (
          <g
            key={coord}
            onClick={clickable ? () => onClick(coord) : undefined}
            style={{ cursor: clickable ? "pointer" : "default" }}
            role={clickable ? "button" : undefined}
            aria-label={`${coord}${marble ? ` ${marble.toLowerCase()} marble` : " empty ring"}${h ? ` (${h})` : ""}`}
            tabIndex={clickable ? 0 : undefined}
            onKeyDown={(e) => {
              if (clickable && (e.key === "Enter" || e.key === " "))
                onClick(coord);
            }}
          >
            {/* Ring: a hoop with a hole, so the table shows through. */}
            <circle
              cx={x + 2}
              cy={y + 3}
              r={RING_RADIUS}
              fill="none"
              stroke="#000"
              strokeWidth="8"
              opacity="0.35"
            />
            <circle
              cx={x}
              cy={y}
              r={RING_RADIUS}
              fill={
                h === "target"
                  ? "rgba(255, 216, 107, 0.18)"
                  : h === "removable"
                    ? "rgba(255, 107, 107, 0.16)"
                    : "rgba(0, 0, 0, 0.25)"
              }
              stroke={ringStroke(h)}
              strokeWidth={h === "target" || h === "removable" ? 6 : 7}
              strokeDasharray={h === "removable" ? "6 5" : undefined}
            />
            {h === "last" && (
              <circle
                cx={x}
                cy={y}
                r={RING_RADIUS + 6}
                fill="none"
                stroke="#4f8fdc"
                strokeWidth="2"
                opacity="0.8"
              />
            )}
            {marble && (
              <g
                key={animation?.key ?? "still"}
                className={animation?.className}
                style={animation?.style}
              >
                <MarbleShape
                  colour={marble}
                  x={x}
                  y={y}
                  r={RING_RADIUS - 5}
                  highlighted={h === "selected" || h === "capturer"}
                />
              </g>
            )}
          </g>
        );
      })}
      {ghosts}
    </svg>
  );
}
