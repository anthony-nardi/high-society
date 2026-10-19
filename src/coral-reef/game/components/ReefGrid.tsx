import { Grid } from "../types";
import { bounds, canPlace, cellKey, COLS, ROWS } from "../board";
import CardFace from "./CardFace";

export type CellHighlight =
  "open" | "target" | "new" | "swap" | "move" | "pick";

/**
 * One player's reef: the cards placed so far on a 4 by 5 canvas that
 * floats around them, with open cells lit when it is yours to grow, and
 * cards a whale turned facedown shown as backs.
 */
export default function ReefGrid({
  grid,
  size = 52,
  highlights = {},
  flipped = [],
  onCell,
  compact = false,
  pickable = false,
}: {
  grid: Grid;
  size?: number;
  highlights?: { [cell: string]: CellHighlight };
  flipped?: string[];
  onCell?: (cell: string) => void;
  compact?: boolean;
  /** An Octopus is in play: any card may be picked up. */
  pickable?: boolean;
}) {
  const b = bounds(grid);
  const gap = Math.max(3, Math.round(size * 0.08));
  const minRow = b
    ? Math.max(
        b.maxRow - ROWS + 1,
        b.minRow - (ROWS - (b.maxRow - b.minRow + 1)),
      )
    : 0;
  const maxRow = b
    ? Math.min(
        b.minRow + ROWS - 1,
        b.maxRow + (ROWS - (b.maxRow - b.minRow + 1)),
      )
    : 0;
  const minCol = b
    ? Math.max(
        b.maxCol - COLS + 1,
        b.minCol - (COLS - (b.maxCol - b.minCol + 1)),
      )
    : 0;
  const maxCol = b
    ? Math.min(
        b.minCol + COLS - 1,
        b.maxCol + (COLS - (b.maxCol - b.minCol + 1)),
      )
    : 0;
  const rows: number[] = [];
  for (let r = minRow; r <= maxRow; r++) rows.push(r);
  const cols: number[] = [];
  for (let c = minCol; c <= maxCol; c++) cols.push(c);
  const showEmpty = !compact && !!onCell;
  const bottom = b ? b.maxRow : 0;

  return (
    <div
      role="grid"
      aria-label="Reef"
      style={{
        display: "inline-grid",
        gridTemplateColumns: `repeat(${cols.length}, ${size}px)`,
        gap,
        padding: gap,
        borderRadius: 10,
        background:
          "linear-gradient(180deg, rgba(20,90,130,0.35) 0%, rgba(10,40,70,0.55) 100%)",
      }}
    >
      {rows.map((r) =>
        cols.map((c) => {
          const key = cellKey(r, c);
          const type = grid[key];
          const h = highlights[key];
          const open = !type && canPlace(grid, r, c);
          const clickable =
            !!onCell &&
            (h === "open" ||
              h === "target" ||
              h === "swap" ||
              h === "move" ||
              h === "pick" ||
              (!!type && (h !== undefined || pickable)));
          const sand = r === bottom && !compact;
          return (
            <div
              key={key}
              role="gridcell"
              aria-label={`${type ?? (open ? "open" : "empty")} ${r},${c}${h ? ` (${h})` : ""}`}
              onClick={clickable ? () => onCell?.(key) : undefined}
              style={{
                width: size,
                height: Math.round(size * 1.3),
                borderRadius: 6,
                cursor: clickable ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border:
                  h === "target" || h === "move"
                    ? "2px solid #ff9f43"
                    : h === "open"
                      ? "2px dashed #ffd86b"
                      : !type && showEmpty
                        ? "1px dashed rgba(255,255,255,0.12)"
                        : "1px solid transparent",
                background:
                  h === "target" || h === "move"
                    ? "rgba(255,159,67,0.2)"
                    : h === "open"
                      ? "rgba(255,216,107,0.1)"
                      : sand && !type
                        ? "rgba(230, 200, 140, 0.08)"
                        : "transparent",
                transition: "background 150ms, border-color 150ms",
              }}
              className={
                h === "open" || h === "target" || h === "move"
                  ? "target-disc"
                  : undefined
              }
            >
              {type && (
                <div className={h === "new" ? "piece-drop" : undefined}>
                  <CardFace
                    type={type}
                    size={size - 4}
                    down={flipped.includes(key)}
                    highlight={
                      h === "swap" || h === "pick"
                        ? "swap"
                        : h === "new"
                          ? "new"
                          : undefined
                    }
                  />
                </div>
              )}
            </div>
          );
        }),
      )}
    </div>
  );
}
