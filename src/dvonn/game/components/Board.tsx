import { CSSProperties } from "react";
import { Coord, DvonnGameState, Piece } from "../types";
import {
  ALL_SPACES,
  hasDvonn,
  hexagon,
  position,
  SPACING,
  viewBox,
} from "../board";
import BoardSurface from "../../../shared/components/BoardSurface";

export type Highlight = "selectable" | "selected" | "target" | "last";

const FILL: { [piece in Piece]: string } = {
  WHITE: "#f1f1f1",
  BLACK: "#1a1a1a",
  DVONN: "#d9342b",
};
const STROKE: { [piece in Piece]: string } = {
  WHITE: "#8a8a8a",
  BLACK: "#000",
  DVONN: "#7a120c",
};
const DISC_R = 17;
/** Vertical offset between the layers of a drawn stack. */
const LAYER = 3;
const MAX_LAYERS = 6;
const HIT_R = SPACING * 0.5;

/** CSS variables telling an animation where a piece came from. */
function offsetFrom(from: Coord, to: Coord): CSSProperties {
  const a = position(from);
  const b = position(to);
  return {
    "--dx": `${a.x - b.x}px`,
    "--dy": `${a.y - b.y}px`,
  } as CSSProperties;
}

/** A stack drawn as layered discs, bottom first, with its height on top when more than one. */
export function Stack({
  x,
  y,
  pieces,
  stroke,
  strokeWidth,
}: {
  x: number;
  y: number;
  pieces: Piece[];
  stroke?: string;
  strokeWidth?: number;
}) {
  const shown = pieces.slice(-MAX_LAYERS);
  const topY = y - (shown.length - 1) * LAYER;
  const top = pieces[pieces.length - 1];
  return (
    <g>
      <circle cx={x + 2} cy={y + 3} r={DISC_R} fill="#000" opacity="0.45" />
      {shown.map((piece, i) => (
        <circle
          key={i}
          cx={x}
          cy={y - i * LAYER}
          r={DISC_R}
          fill={FILL[piece]}
          stroke={i === shown.length - 1 && stroke ? stroke : STROKE[piece]}
          strokeWidth={
            i === shown.length - 1 && strokeWidth ? strokeWidth : 1.5
          }
        />
      ))}
      {hasDvonn(pieces) && top !== "DVONN" && (
        <circle
          cx={x + DISC_R * 0.55}
          cy={topY - DISC_R * 0.55}
          r="4.5"
          fill={FILL.DVONN}
          stroke={STROKE.DVONN}
        />
      )}
      {pieces.length > 1 && (
        <text
          x={x}
          y={topY + 5}
          textAnchor="middle"
          fontSize="15"
          fontWeight="700"
          fill={top === "WHITE" ? "#222" : "#fff"}
          style={{ pointerEvents: "none" }}
        >
          {pieces.length}
        </text>
      )}
    </g>
  );
}

/** The 49-space board on wood: hexagonal cells, stacks as layered discs. */
export default function Board({
  gameState,
  highlights,
  onClick,
}: {
  gameState: DvonnGameState;
  highlights: { [coord: Coord]: Highlight };
  onClick?: (coord: Coord) => void;
}) {
  const box = viewBox();
  const last = gameState.lastMove;
  const moveKey = `${last?.placed}:${last?.from}:${last?.to}`;
  const removalKey = `${moveKey}:${last?.removed?.join("|")}`;

  const ghosts: React.ReactNode[] = [];
  for (const [i, coord] of (last?.removed || []).entries()) {
    if (gameState.stacks?.[coord]) continue;
    const { x, y } = position(coord);
    const top = last?.removedTops?.[i] ?? "BLACK";
    ghosts.push(
      <g
        key={`lost-${i}-${removalKey}`}
        className="piece piece-lift"
        style={{ animationDelay: `${120 + i * 60}ms` }}
        aria-hidden="true"
      >
        <Stack x={x} y={y} pieces={[top]} />
      </g>,
    );
  }

  let trail: React.ReactNode = null;
  if (last?.from && last?.to) {
    const a = position(last.from);
    const b = position(last.to);
    trail = (
      <line
        key={`trail-${moveKey}`}
        className="trail"
        x1={a.x}
        y1={a.y}
        x2={b.x}
        y2={b.y}
        stroke="#4f8fdc"
        strokeWidth="3"
        strokeDasharray="7 6"
        strokeLinecap="round"
        aria-hidden="true"
      />
    );
  }

  return (
    <svg
      viewBox={`${box.minX} ${box.minY} ${box.width} ${box.height}`}
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
      aria-label="DVONN board"
    >
      <BoardSurface id="dvonn" box={box} radius={28} />

      {/* Cells */}
      {ALL_SPACES.map((coord) => {
        const { x, y } = position(coord);
        return (
          <polygon
            key={coord}
            points={hexagon(x, y, SPACING * 0.54)}
            fill="rgba(0, 0, 0, 0.16)"
            stroke="rgba(28, 16, 6, 0.6)"
            strokeWidth="1.5"
          />
        );
      })}

      {trail}

      {ALL_SPACES.map((coord) => {
        const { x, y } = position(coord);
        const h = highlights[coord];
        const stack = gameState.stacks?.[coord];
        const top = stack?.[stack.length - 1];
        const clickable = !!onClick && !!h && h !== "last";
        const desc = stack
          ? ` ${top === "DVONN" ? "DVONN" : top?.toLowerCase()} stack of ${stack.length}`
          : " empty";
        const label = `${coord}${desc}${h ? ` (${h})` : ""}`;
        const moved = !!stack && last?.to === coord && !!last.from;
        const placed = !!stack && last?.placed === coord;
        const ringStroke =
          h === "selected"
            ? "#ffd86b"
            : h === "selectable"
              ? "rgba(255, 216, 107, 0.75)"
              : undefined;
        return (
          <g
            key={coord}
            className="point"
            onClick={onClick ? () => onClick(coord) : undefined}
            style={{ cursor: clickable ? "pointer" : "default" }}
            role={clickable ? "button" : undefined}
            aria-label={label}
            tabIndex={clickable ? 0 : undefined}
            onKeyDown={(e) => {
              if (clickable && (e.key === "Enter" || e.key === " "))
                onClick(coord);
            }}
          >
            <circle cx={x} cy={y} r={HIT_R} fill="transparent" />
            {h === "target" && (
              <circle
                className="target-disc"
                cx={x}
                cy={y}
                r={DISC_R + 8}
                fill="rgba(255, 216, 107, 0.3)"
                stroke="#ffd86b"
                strokeWidth="3"
              />
            )}
            {h === "last" && (
              <circle
                cx={x}
                cy={y}
                r={DISC_R + 7}
                fill="none"
                stroke="#4f8fdc"
                strokeWidth="2"
                opacity="0.8"
              />
            )}
            {stack && (
              <g
                key={
                  moved
                    ? `slide-${moveKey}`
                    : placed
                      ? `drop-${moveKey}`
                      : "still"
                }
                className={
                  moved
                    ? "piece piece-slide"
                    : placed
                      ? "piece piece-drop"
                      : undefined
                }
                style={
                  moved && last?.from ? offsetFrom(last.from, coord) : undefined
                }
              >
                <Stack
                  x={x}
                  y={y}
                  pieces={stack}
                  stroke={ringStroke}
                  strokeWidth={
                    h === "selected" ? 4 : h === "selectable" ? 3 : undefined
                  }
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
