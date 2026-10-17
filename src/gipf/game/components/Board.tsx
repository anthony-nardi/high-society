import { CSSProperties } from "react";
import { Coord, GipfGameState, Side } from "../types";
import {
  ALL_SPOTS,
  directionTo,
  DOTS,
  LINES,
  position,
  SPACING,
  step,
  viewBox,
} from "../board";
import BoardSurface from "../../../shared/components/BoardSurface";

export type Highlight = "dot" | "selectedDot" | "target" | "row" | "last";

const FILL = { WHITE: "#f1f1f1", BLACK: "#1a1a1a" };
const STROKE = { WHITE: "#8a8a8a", BLACK: "#000" };
const PIECE_R = 16;
const HIT_R = SPACING * 0.46;
const LINE = "rgba(28, 16, 6, 0.75)";
const DOT = "#f6edd0";

function offsetFrom(from: Coord, to: Coord): CSSProperties {
  const a = position(from);
  const b = position(to);
  return {
    "--dx": `${a.x - b.x}px`,
    "--dy": `${a.y - b.y}px`,
  } as CSSProperties;
}

function PieceShape({
  x,
  y,
  side,
  stroke,
  strokeWidth,
}: {
  x: number;
  y: number;
  side: Side;
  stroke?: string;
  strokeWidth?: number;
}) {
  return (
    <>
      <circle cx={x + 2} cy={y + 3} r={PIECE_R} fill="#000" opacity="0.45" />
      <circle
        cx={x}
        cy={y}
        r={PIECE_R}
        fill={FILL[side]}
        stroke={stroke ?? STROKE[side]}
        strokeWidth={strokeWidth ?? 1.5}
      />
    </>
  );
}

/** The GIPF board on wood: 21 lines between 24 dots, 37 spots, pieces as discs. */
export default function Board({
  gameState,
  highlights,
  onClick,
}: {
  gameState: GipfGameState;
  highlights: { [coord: Coord]: Highlight };
  onClick?: (coord: Coord) => void;
}) {
  const box = viewBox();
  const last = gameState.lastMove;
  const moveKey = `${last?.from}:${last?.to}:${last?.shifted?.join("|")}`;
  const removalKey = `${moveKey}:${last?.removed?.join("|")}`;
  const direction =
    last?.from && last?.to ? directionTo(last.from, last.to) : null;
  const shifted = new Set(last?.shifted || []);

  const ghosts: React.ReactNode[] = [];
  for (const [i, coord] of (last?.removed || []).entries()) {
    if (gameState.pieces?.[coord]) continue;
    const { x, y } = position(coord);
    const side = last?.removedColours?.[i] ?? "WHITE";
    ghosts.push(
      <g
        key={`taken-${i}-${removalKey}`}
        className="piece piece-lift"
        style={{ animationDelay: `${150 + i * 50}ms` }}
        aria-hidden="true"
      >
        <PieceShape x={x} y={y} side={side} />
      </g>,
    );
  }

  // The arrow from a selected dot to its landing spots.
  const arrows: React.ReactNode[] = [];
  const selectedDot = Object.keys(highlights).find(
    (c) => highlights[c] === "selectedDot",
  );
  if (selectedDot) {
    for (const target of Object.keys(highlights).filter(
      (c) => highlights[c] === "target",
    )) {
      const a = position(selectedDot);
      const b = position(target);
      arrows.push(
        <line
          key={`arrow-${target}`}
          x1={a.x}
          y1={a.y}
          x2={b.x}
          y2={b.y}
          stroke="#ffd86b"
          strokeWidth="4"
          strokeLinecap="round"
          opacity="0.9"
          aria-hidden="true"
        />,
      );
    }
  }

  return (
    <svg
      viewBox={`${box.minX} ${box.minY} ${box.width} ${box.height}`}
      width="100%"
      style={{
        display: "block",
        maxWidth: 620,
        margin: "0 auto",
        touchAction: "manipulation",
        userSelect: "none",
        WebkitTapHighlightColor: "transparent",
      }}
      role="group"
      aria-label="GIPF board"
    >
      <BoardSurface id="gipf" box={box} radius={box.width / 2} />

      {LINES.map(({ ends }, i) => {
        const a = position(ends[0]);
        const b = position(ends[1]);
        return (
          <line
            key={i}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={LINE}
            strokeWidth="2"
          />
        );
      })}

      {arrows}

      {[...DOTS, ...ALL_SPOTS].map((coord) => {
        const { x, y } = position(coord);
        const h = highlights[coord];
        const isDot = DOTS.includes(coord);
        const piece = gameState.pieces?.[coord];
        const clickable = !!onClick && !!h && h !== "last";
        const what = isDot
          ? " dot"
          : piece
            ? ` ${piece.toLowerCase()} piece`
            : " empty";
        const label = `${coord}${what}${h ? ` (${h})` : ""}`;
        const entered = !!piece && last?.to === coord && !!last.from;
        const pushed = !!piece && shifted.has(coord) && !!direction;
        const from =
          entered && last?.from
            ? last.from
            : pushed && direction
              ? step(coord, [-direction[0], -direction[1]])
              : null;
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
            {isDot ? (
              <circle
                className={
                  h === "dot" || h === "selectedDot" ? "target-disc" : undefined
                }
                cx={x}
                cy={y}
                r={h === "selectedDot" ? 11 : h === "dot" ? 9 : 5}
                fill={
                  h === "selectedDot"
                    ? "#ffd86b"
                    : h === "dot"
                      ? "rgba(255, 216, 107, 0.5)"
                      : DOT
                }
                stroke={
                  h === "dot" || h === "selectedDot"
                    ? "#ffd86b"
                    : "rgba(0,0,0,0.5)"
                }
                strokeWidth="2"
                opacity={h ? 1 : 0.8}
              />
            ) : (
              <circle
                className={h === "target" ? "target-disc" : undefined}
                cx={x}
                cy={y}
                r={h === "target" ? 14 : 3.5}
                fill={h === "target" ? "rgba(255, 216, 107, 0.6)" : LINE}
                stroke={h === "target" ? "#ffd86b" : "none"}
                strokeWidth="2"
              />
            )}
            {h === "last" && (
              <circle
                cx={x}
                cy={y}
                r={PIECE_R + 6}
                fill="none"
                stroke="#4f8fdc"
                strokeWidth="2"
                opacity="0.8"
              />
            )}
            {piece && h === "row" && (
              <circle
                className="row-glow"
                cx={x}
                cy={y}
                r={PIECE_R + 7}
                fill="rgba(255, 107, 107, 0.35)"
                stroke="#ff6b6b"
                strokeWidth="2"
                aria-hidden="true"
              />
            )}
            {piece && (
              <g
                key={from ? `slide-${moveKey}` : "still"}
                className={from ? "piece piece-slide" : undefined}
                style={from ? offsetFrom(from, coord) : undefined}
              >
                <PieceShape
                  x={x}
                  y={y}
                  side={piece}
                  stroke={h === "row" ? "#ff6b6b" : undefined}
                  strokeWidth={h === "row" ? 3 : undefined}
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
