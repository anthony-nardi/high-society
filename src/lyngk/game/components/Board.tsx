import { CSSProperties } from "react";
import { Coord, LyngkGameState, Piece } from "../types";
import {
  ALL_SPOTS,
  DIRECTIONS,
  isSpot,
  position,
  SPACING,
  step,
  viewBox,
} from "../board";
import { FILL, INK, label, STROKE } from "../pieces";
import BoardSurface from "../../../shared/components/BoardSurface";

export type Highlight =
  "selectable" | "selected" | "link" | "path" | "target" | "last";

const DISC_R = 17;
const LAYER = 3;
const HIT_R = SPACING * 0.48;
const LINE = "rgba(28, 16, 6, 0.75)";

function offsetFrom(from: Coord, to: Coord): CSSProperties {
  const a = position(from);
  const b = position(to);
  return {
    "--dx": `${a.x - b.x}px`,
    "--dy": `${a.y - b.y}px`,
  } as CSSProperties;
}

/** A stack drawn as layered discs, bottom first, with its height when more than one. */
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
  const topY = y - (pieces.length - 1) * LAYER;
  const top = pieces[pieces.length - 1];
  return (
    <g>
      <circle cx={x + 2} cy={y + 3} r={DISC_R} fill="#000" opacity="0.45" />
      {pieces.map((piece, i) => (
        <circle
          key={i}
          cx={x}
          cy={y - i * LAYER}
          r={DISC_R}
          fill={piece === "JOKER" ? "url(#lyngk-joker)" : FILL[piece]}
          stroke={i === pieces.length - 1 && stroke ? stroke : STROKE[piece]}
          strokeWidth={
            i === pieces.length - 1 && strokeWidth ? strokeWidth : 1.5
          }
        />
      ))}
      {pieces.length > 1 && (
        <text
          x={x}
          y={topY + 5}
          textAnchor="middle"
          fontSize="15"
          fontWeight="700"
          fill={INK[top]}
          style={{ pointerEvents: "none" }}
        >
          {pieces.length}
        </text>
      )}
    </g>
  );
}

/** Board lines: every maximal line of spots along the three axes. */
function lines(): [Coord, Coord][] {
  const out: [Coord, Coord][] = [];
  for (const axis of DIRECTIONS.filter(
    ([dx, dy]) => dx > 0 || (dx === 0 && dy > 0),
  )) {
    const back: [number, number] = [-axis[0], -axis[1]];
    for (const spot of ALL_SPOTS) {
      if (isSpot(step(spot, back))) continue;
      let end = spot;
      while (isSpot(step(end, axis))) end = step(end, axis);
      if (end !== spot) out.push([spot, end]);
    }
  }
  return out;
}
const LINES = lines();

/** The 43-spot board on wood with layered stacks. */
export default function Board({
  gameState,
  highlights,
  onClick,
}: {
  gameState: LyngkGameState;
  highlights: { [coord: Coord]: Highlight };
  onClick?: (coord: Coord) => void;
}) {
  const box = viewBox();
  const last = gameState.lastMove;
  const moveKey = `${last?.path?.join("|")}:${last?.claimed}`;
  const removalKey = `${moveKey}:${last?.removed}`;
  const landing = last?.path?.[last.path.length - 1];
  const origin = last?.path?.[0];

  const ghosts: React.ReactNode[] = [];
  if (
    last?.removed &&
    last.removedPieces &&
    !gameState.stacks?.[last.removed]
  ) {
    const { x, y } = position(last.removed);
    ghosts.push(
      <g
        key={`five-${removalKey}`}
        className="piece piece-lift"
        style={{ animationDelay: "350ms" }}
        aria-hidden="true"
      >
        <Stack x={x} y={y} pieces={last.removedPieces} />
      </g>,
    );
  }

  // The chosen route so far, and the last move's route.
  const route = Object.keys(highlights)
    .filter((c) => highlights[c] === "selected" || highlights[c] === "path")
    .sort((a, b) =>
      highlights[a] === "selected" ? -1 : highlights[b] === "selected" ? 1 : 0,
    );
  const arrows: React.ReactNode[] = [];
  const drawRoute = (points: Coord[], colour: string, key: string) => {
    for (let i = 1; i < points.length; i++) {
      const a = position(points[i - 1]);
      const b = position(points[i]);
      arrows.push(
        <line
          key={`${key}-${i}`}
          className={key === "last" ? "trail" : undefined}
          x1={a.x}
          y1={a.y}
          x2={b.x}
          y2={b.y}
          stroke={colour}
          strokeWidth="4"
          strokeDasharray="8 6"
          strokeLinecap="round"
          opacity="0.9"
          aria-hidden="true"
        />,
      );
    }
  };
  if (last?.path && last.path.length > 1)
    drawRoute(last.path, "#4f8fdc", "last");

  return (
    <svg
      viewBox={`${box.minX} ${box.minY} ${box.width} ${box.height}`}
      width="100%"
      style={{
        display: "block",
        maxWidth: 640,
        margin: "0 auto",
        touchAction: "manipulation",
        userSelect: "none",
        WebkitTapHighlightColor: "transparent",
      }}
      role="group"
      aria-label="LYNGK board"
    >
      <defs>
        <pattern
          id="lyngk-joker"
          patternUnits="userSpaceOnUse"
          width="6"
          height="6"
        >
          <rect width="6" height="6" fill="#ffffff" />
          <circle cx="1.5" cy="1.5" r="1" fill="#b9b9b9" />
          <circle cx="4.5" cy="4.5" r="1" fill="#d0d0d0" />
        </pattern>
      </defs>
      <BoardSurface id="lyngk" box={box} radius={30} />

      {LINES.map(([a, b], i) => {
        const pa = position(a);
        const pb = position(b);
        return (
          <line
            key={i}
            x1={pa.x}
            y1={pa.y}
            x2={pb.x}
            y2={pb.y}
            stroke={LINE}
            strokeWidth="1.5"
          />
        );
      })}

      {arrows}
      {route.length > 1 &&
        route.slice(1).map((c, i) => {
          const a = position(route[i]);
          const b = position(c);
          return (
            <line
              key={`route-${c}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="#ffd86b"
              strokeWidth="4"
              strokeLinecap="round"
              opacity="0.9"
              aria-hidden="true"
            />
          );
        })}

      {ALL_SPOTS.map((coord) => {
        const { x, y } = position(coord);
        const h = highlights[coord];
        const stack = gameState.stacks?.[coord];
        const top = stack?.[stack.length - 1];
        const clickable = !!onClick && !!h && h !== "last" && h !== "path";
        const desc = stack
          ? ` ${label(top as Piece)} stack of ${stack.length}`
          : " empty";
        const aria = `${coord}${desc}${h ? ` (${h})` : ""}`;
        const moved =
          !!stack && landing === coord && !!origin && origin !== coord;
        const ringStroke =
          h === "selected"
            ? "#ffd86b"
            : h === "selectable"
              ? "rgba(255, 216, 107, 0.75)"
              : h === "link"
                ? "#4fd1c5"
                : h === "path"
                  ? "#ffd86b"
                  : undefined;
        return (
          <g
            key={coord}
            className="point"
            onClick={onClick ? () => onClick(coord) : undefined}
            style={{ cursor: clickable ? "pointer" : "default" }}
            role={clickable ? "button" : undefined}
            aria-label={aria}
            tabIndex={clickable ? 0 : undefined}
            onKeyDown={(e) => {
              if (clickable && (e.key === "Enter" || e.key === " "))
                onClick(coord);
            }}
          >
            <circle cx={x} cy={y} r={HIT_R} fill="transparent" />
            <circle cx={x} cy={y} r="3.5" fill={LINE} />
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
            {h === "link" && (
              <circle
                className="target-disc"
                cx={x}
                cy={y}
                r={DISC_R + 8}
                fill="rgba(79, 209, 197, 0.25)"
                stroke="#4fd1c5"
                strokeWidth="3"
                strokeDasharray="6 4"
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
                key={moved ? `slide-${moveKey}` : "still"}
                className={moved ? "piece piece-slide" : undefined}
                style={moved && origin ? offsetFrom(origin, coord) : undefined}
              >
                <Stack
                  x={x}
                  y={y}
                  pieces={stack}
                  stroke={ringStroke}
                  strokeWidth={
                    ringStroke ? (h === "selected" ? 4 : 3) : undefined
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
