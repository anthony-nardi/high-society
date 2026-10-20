import { useState } from "react";
import { AcquireGameState, Chain, Tile } from "../types";
import {
  CHAIN_COLOUR,
  COLUMNS,
  currentPrice,
  describe,
  isPlayable,
  label,
  money,
  ROWS,
  touchedChains,
} from "../board";

const CELL = 36;
const GAP = 3;
const PAD = 22;

/** The twelve-by-nine board: chains in colour, lone tiles grey, your hand as ghosts. */
export default function Board({
  gameState,
  hand,
  lastTile,
  onTile,
  doomed,
  survivor,
  focusChain,
  preview,
  ghost,
}: {
  gameState: AcquireGameState;
  /** Your tiles, drawn in place as outlines. */
  hand: Tile[];
  lastTile?: Tile;
  onTile?: (tile: Tile) => void;
  /** The chain being swallowed right now, and the one swallowing it. */
  doomed?: Chain;
  survivor?: Chain;
  /** A chain to light up, the rest dimmed. */
  focusChain?: Chain | null;
  /** A tile lifted from the hand: it and the chains it would touch light up. */
  preview?: Tile | null;
  /** A tile just played, shown at once while the server catches up. */
  ghost?: Tile | null;
}) {
  const width = PAD + COLUMNS * (CELL + GAP) + 6;
  const height = PAD + ROWS.length * (CELL + GAP) + 6;
  const handSet = new Set(hand);
  // What is lit: a chain pointed at in the table, or what a lifted tile would touch.
  const litChains = new Set<Chain>(
    preview
      ? touchedChains(gameState, preview)
      : focusChain
        ? [focusChain]
        : [],
  );
  const dimming = litChains.size > 0 || !!preview;

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
          const ghosted = ghost === tile && !gameState.board?.[tile];
          const owner =
            gameState.board?.[tile] ??
            (ghosted ? ghostOwner(gameState, tile) : undefined);
          const inHand = handSet.has(tile) && !ghosted;
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
          const lit =
            preview === tile ||
            (owner && owner !== "NONE" && litChains.has(owner)) ||
            (preview !== undefined &&
              preview !== null &&
              owner === "NONE" &&
              touchesLone(preview, tile));
          const tip =
            owner && owner !== "NONE"
              ? `${label(owner)}: ${gameState.chains[owner].size} tiles, ${money(currentPrice(gameState, owner))} a share`
              : owner === "NONE"
                ? `${tile}: a lone tile`
                : inHand
                  ? `${tile}: ${describe(gameState, tile)}`
                  : undefined;
          return (
            <g
              key={tile}
              className={playable ? "point" : undefined}
              onClick={playable ? () => onTile(tile) : undefined}
              role={playable ? "button" : undefined}
              aria-label={aria}
              tabIndex={playable ? 0 : undefined}
              onKeyDown={(e) => {
                if (playable && (e.key === "Enter" || e.key === " "))
                  onTile(tile);
              }}
              opacity={dimming && !lit && !inHand ? 0.35 : 1}
              style={{
                cursor: playable ? "pointer" : "default",
                transition: "opacity 180ms",
              }}
              data-lit={lit ? "true" : undefined}
            >
              {tip && <title>{tip}</title>}
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
                      : owner && owner === doomed
                        ? "tile-doomed"
                        : owner && owner === survivor
                          ? "tile-survivor"
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
                  lastTile === tile || lit
                    ? "#ffd86b"
                    : inHand
                      ? playable
                        ? "#ffd86b"
                        : "rgba(255,255,255,0.35)"
                      : "rgba(0,0,0,0.5)"
                }
                strokeWidth={lastTile === tile || lit ? 3 : inHand ? 2 : 1}
                strokeDasharray={
                  (inHand && !owner) || ghosted ? "4 3" : undefined
                }
                opacity={inHand && !playable ? 0.6 : ghosted ? 0.75 : 1}
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

/** The colour a tile just played will take: its chain if it grows one, else a lone tile. */
function ghostOwner(state: AcquireGameState, tile: Tile): Chain | "NONE" {
  const chains = touchedChains(state, tile);
  return chains.length === 1 ? chains[0] : "NONE";
}

/** Whether a lone tile sits beside the tile about to be played. */
function touchesLone(played: Tile, lone: Tile) {
  const col = (t: Tile) => Number(t.slice(0, -1));
  const row = (t: Tile) => ROWS.indexOf(t.slice(-1));
  return (
    Math.abs(col(played) - col(lone)) + Math.abs(row(played) - row(lone)) === 1
  );
}
