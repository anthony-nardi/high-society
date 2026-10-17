import { CSSProperties } from "react";
import { Coord, Side, YinshGameState } from "../types";
import { ALL_POINTS, LINES, position, SPACING, viewBox } from "../board";
import BoardSurface from "../../../shared/components/BoardSurface";

export type Highlight =
  "selected" | "target" | "row" | "rowStart" | "removable" | "last";

const SIDE_FILL = { WHITE: "#f1f1f1", BLACK: "#1a1a1a" };
const SIDE_STROKE = { WHITE: "#8a8a8a", BLACK: "#000" };
const MARKER_R = 12;
const RING_R = 18;
/** Invisible tap target covering each point's share of the board. */
const HIT_R = SPACING * 0.48;
const LINE = "rgba(28, 16, 6, 0.75)";
const DOT = "rgba(28, 16, 6, 0.9)";

const other = (side: Side): Side => (side === "WHITE" ? "BLACK" : "WHITE");

/** CSS variables telling an animation where a piece came from. */
function offsetFrom(from: Coord, to: Coord): CSSProperties {
  const a = position(from);
  const b = position(to);
  return {
    "--dx": `${a.x - b.x}px`,
    "--dy": `${a.y - b.y}px`,
  } as CSSProperties;
}

function Marker({
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
      <circle
        cx={x + 1.5}
        cy={y + 2.5}
        r={MARKER_R}
        fill="#000"
        opacity="0.4"
      />
      <circle
        cx={x}
        cy={y}
        r={MARKER_R}
        fill={SIDE_FILL[side]}
        stroke={stroke ?? SIDE_STROKE[side]}
        strokeWidth={strokeWidth ?? 1.5}
      />
    </>
  );
}

function Ring({
  x,
  y,
  side,
  stroke,
  strokeWidth,
  dashed,
}: {
  x: number;
  y: number;
  side: Side;
  stroke?: string;
  strokeWidth?: number;
  dashed?: boolean;
}) {
  return (
    <>
      <circle
        cx={x + 2}
        cy={y + 3}
        r={RING_R}
        fill="none"
        stroke="#000"
        strokeWidth="7"
        opacity="0.4"
      />
      <circle
        cx={x}
        cy={y}
        r={RING_R}
        fill="none"
        stroke={stroke ?? SIDE_FILL[side]}
        strokeWidth={strokeWidth ?? 7}
        strokeDasharray={dashed ? "6 4" : undefined}
      />
      <circle
        cx={x}
        cy={y}
        r={RING_R}
        fill="none"
        stroke={SIDE_STROKE[side]}
        strokeWidth="1"
        opacity="0.6"
      />
    </>
  );
}

/** The 85-point board drawn as lines on wood, with rings as hoops and markers as discs. */
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
  const last = gameState.lastMove;
  // Remounting the animated pieces on each new move restarts their animation.
  const moveKey = `${last?.from}:${last?.to}`;
  const rowKey = `${moveKey}:${last?.removed?.join("|")}`;
  const ringKey = `${moveKey}:${last?.removedRing}`;
  const flipIndex = new Map((last?.flipped || []).map((c, i) => [c, i]));

  // Ghosts of pieces just taken off the board, lifting away.
  const ghosts: React.ReactNode[] = [];
  const removedBy = last?.removedBy ?? "WHITE";
  for (const [i, coord] of (last?.removed || []).entries()) {
    if (gameState.markers?.[coord]) continue;
    const { x, y } = position(coord);
    ghosts.push(
      <g
        key={`taken-${i}-${rowKey}`}
        className="piece piece-lift"
        style={{ animationDelay: `${i * 60}ms` }}
        aria-hidden="true"
      >
        <Marker x={x} y={y} side={removedBy} />
      </g>,
    );
  }
  if (last?.removedRing && !gameState.rings?.[last.removedRing]) {
    const { x, y } = position(last.removedRing);
    ghosts.push(
      <g
        key={`ring-${ringKey}`}
        className="piece piece-lift"
        aria-hidden="true"
      >
        <Ring x={x} y={y} side={removedBy} />
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
        maxWidth: 640,
        margin: "0 auto",
        touchAction: "manipulation",
        userSelect: "none",
        WebkitTapHighlightColor: "transparent",
      }}
      role="group"
      aria-label="YINSH board"
    >
      <BoardSurface id="yinsh" box={box} />

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
            stroke={LINE}
            strokeWidth="1.5"
          />
        );
      })}

      {trail}

      {ALL_POINTS.map((coord) => {
        const { x, y } = position(coord);
        const h = highlights[coord];
        const ring = gameState.rings?.[coord];
        const marker = gameState.markers?.[coord];
        const clickable = !!onClick && !!h && h !== "last";
        const label = `${coord}${ring ? ` ${ring.toLowerCase()} ring` : marker ? ` ${marker.toLowerCase()} marker` : " empty"}${h ? ` (${h})` : ""}`;
        const inRow = h === "row" || h === "rowStart";
        const markerStroke = inRow ? "#ff6b6b" : undefined;
        const markerWidth = h === "rowStart" ? 5 : h === "row" ? 3 : undefined;
        const flip = marker ? flipIndex.get(coord) : undefined;
        const ringMoved = !!ring && last?.to === coord && !!last.from;
        const ringPlaced =
          !!ring &&
          gameState.phase === "PLACE_RINGS" &&
          last?.to === coord &&
          !last.from;
        const markerLeft = !!marker && last?.from === coord;
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
            {/* Hit area first, so a tap anywhere near the point lands. */}
            <circle cx={x} cy={y} r={HIT_R} fill="transparent" />
            {/* Intersection dot, or a target disc. */}
            <circle
              className={h === "target" ? "target-disc" : undefined}
              cx={x}
              cy={y}
              r={h === "target" ? 13 : 3}
              fill={h === "target" ? "rgba(255, 216, 107, 0.6)" : DOT}
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
            {marker && inRow && (
              <circle
                className="row-glow"
                cx={x}
                cy={y}
                r={MARKER_R + 6}
                fill="rgba(255, 107, 107, 0.35)"
                stroke="#ff6b6b"
                strokeWidth="2"
                aria-hidden="true"
              />
            )}
            {marker && flip !== undefined && (
              // The colour it was before the ring went over it, turning away.
              <g
                key={`flip-out-${moveKey}`}
                className="piece piece-flip-out"
                style={{ animationDelay: `${flip * 70}ms` }}
                aria-hidden="true"
              >
                <Marker x={x} y={y} side={other(marker)} />
              </g>
            )}
            {marker && (
              <g
                key={
                  flip !== undefined
                    ? `flip-in-${moveKey}`
                    : markerLeft
                      ? `left-${moveKey}`
                      : "still"
                }
                className={
                  flip !== undefined
                    ? "piece piece-flip-in"
                    : markerLeft
                      ? "piece piece-drop"
                      : undefined
                }
                style={
                  flip !== undefined
                    ? { animationDelay: `${flip * 70}ms` }
                    : undefined
                }
              >
                <Marker
                  x={x}
                  y={y}
                  side={marker}
                  stroke={markerStroke}
                  strokeWidth={markerWidth}
                />
              </g>
            )}
            {ring && (
              <g
                key={
                  ringMoved
                    ? `slide-${moveKey}`
                    : ringPlaced
                      ? `place-${moveKey}`
                      : "still"
                }
                className={
                  ringMoved
                    ? "piece piece-slide"
                    : ringPlaced
                      ? "piece piece-drop"
                      : undefined
                }
                style={
                  ringMoved && last?.from
                    ? offsetFrom(last.from, coord)
                    : undefined
                }
              >
                <Ring
                  x={x}
                  y={y}
                  side={ring}
                  stroke={
                    h === "selected"
                      ? "#ffd86b"
                      : h === "removable"
                        ? "#ff6b6b"
                        : undefined
                  }
                  strokeWidth={
                    h === "selected" || h === "removable" ? 8 : undefined
                  }
                  dashed={h === "removable"}
                />
              </g>
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
      {ghosts}
    </svg>
  );
}
