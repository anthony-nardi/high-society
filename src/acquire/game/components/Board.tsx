import { useState } from "react";
import { AcquireGameState, Tile } from "../types";
import { CHAIN_COLOUR, COLUMNS, describe, isPlayable, ROWS } from "../board";

const CELL = 36;
const GAP = 3;
const PAD = 22;

/** The twelve-by-nine board: chains in colour, lone tiles grey, your hand as ghosts. */
export default function Board({
  gameState,
  hand,
  lastTile,
  onTile,
}: {
  gameState: AcquireGameState;
  /** Your tiles, drawn in place as outlines. */
  hand: Tile[];
  lastTile?: Tile;
  onTile?: (tile: Tile) => void;
}) {
  const width = PAD + COLUMNS * (CELL + GAP) + 6;
  const height = PAD + ROWS.length * (CELL + GAP) + 6;
  const handSet = new Set(hand);

  // Tiles whose chain changed since the last board: a merger or a founding
  // sweeping them into a new colour. They flash; the played tile pulses.
  const board = gameState.board;
  const [seen, setSeen] = useState<{
    board: typeof board;
    changed: Set<string>;
  }>({ board, changed: new Set() });
  if (seen.board !== board) {
    const changed = new Set<string>();
    const before = seen.board || {};
    for (const [tile, owner] of Object.entries(board || {}))
      if (before[tile] !== undefined && before[tile] !== owner)
        changed.add(tile);
    setSeen({ board, changed });
  }
  const changed = seen.board === board ? seen.changed : new Set<string>();
  const animationKey = `${gameState.turn}:${gameState.phase}:${lastTile}:${Object.keys(board || {}).length}`;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
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
      aria-label="Acquire board"
    >
      <rect
        x="0"
        y="0"
        width={width}
        height={height}
        rx="10"
        fill="#1d2230"
        stroke="rgba(255,255,255,0.08)"
      />
      {Array.from({ length: COLUMNS }, (_, c) => (
        <text
          key={`c${c}`}
          x={PAD + c * (CELL + GAP) + CELL / 2}
          y="14"
          textAnchor="middle"
          fontSize="11"
          fill="rgba(255,255,255,0.45)"
        >
          {c + 1}
        </text>
      ))}
      {[...ROWS].map((row, r) => (
        <text
          key={`r${row}`}
          x="10"
          y={PAD + r * (CELL + GAP) + CELL / 2 + 4}
          textAnchor="middle"
          fontSize="11"
          fill="rgba(255,255,255,0.45)"
        >
          {row}
        </text>
      ))}
      {[...ROWS].flatMap((row, r) =>
        Array.from({ length: COLUMNS }, (_, c) => {
          const tile = `${c + 1}${row}`;
          const x = PAD + c * (CELL + GAP);
          const y = PAD + r * (CELL + GAP);
          const owner = gameState.board?.[tile];
          const inHand = handSet.has(tile);
          const playable = inHand && !!onTile && isPlayable(gameState, tile);
          const fill =
            owner === "NONE"
              ? "#9aa0ad"
              : owner
                ? CHAIN_COLOUR[owner]
                : "rgba(255,255,255,0.05)";
          const aria = owner
            ? `${tile}: ${owner === "NONE" ? "lone tile" : owner.toLowerCase()}`
            : inHand
              ? `${tile} in your hand: ${describe(gameState, tile)}`
              : tile;
          return (
            <g
              key={tile}
              className={playable ? "point" : undefined}
              onClick={playable ? () => onTile(tile) : undefined}
              style={{ cursor: playable ? "pointer" : "default" }}
              role={playable ? "button" : undefined}
              aria-label={aria}
              tabIndex={playable ? 0 : undefined}
              onKeyDown={(e) => {
                if (playable && (e.key === "Enter" || e.key === " "))
                  onTile(tile);
              }}
            >
              <rect
                key={
                  lastTile === tile || changed.has(tile)
                    ? animationKey
                    : undefined
                }
                className={
                  lastTile === tile && owner
                    ? "tile-pulse"
                    : changed.has(tile)
                      ? "tile-convert"
                      : inHand
                        ? "target-disc"
                        : undefined
                }
                x={x}
                y={y}
                width={CELL}
                height={CELL}
                rx="5"
                fill={fill}
                stroke={
                  lastTile === tile
                    ? "#ffd86b"
                    : inHand
                      ? playable
                        ? "#ffd86b"
                        : "rgba(255,255,255,0.35)"
                      : "rgba(0,0,0,0.5)"
                }
                strokeWidth={lastTile === tile ? 3 : inHand ? 2 : 1}
                strokeDasharray={inHand && !owner ? "4 3" : undefined}
                opacity={inHand && !playable ? 0.6 : 1}
              />
              {owner && owner !== "NONE" && (
                <text
                  x={x + CELL / 2}
                  y={y + CELL / 2 + 5}
                  textAnchor="middle"
                  fontSize="14"
                  fontWeight="800"
                  fill="#fff"
                  style={{ pointerEvents: "none" }}
                >
                  {owner.charAt(0)}
                </text>
              )}
              {(inHand || owner === "NONE") && (
                <text
                  x={x + CELL / 2}
                  y={y + CELL / 2 + 4}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="700"
                  fill={owner ? "#1d2230" : "rgba(255,255,255,0.8)"}
                  style={{ pointerEvents: "none" }}
                >
                  {tile}
                </text>
              )}
            </g>
          );
        }),
      )}
    </svg>
  );
}
