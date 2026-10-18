import { Colour, Dynasty } from "../types";
import { COLOUR_HEX, DYNASTY_SYMBOL, components, isKingdom } from "../board";
import { TileSymbol } from "./TileIcon";

/** A small board for the rules: a few tiles and leaders, drawn like the real one. */
export type MiniSpec = {
  cols: number;
  rows: number;
  river?: string[];
  border?: string[];
  tiles?: {
    [cell: string]: { colour: Colour; treasure?: boolean; down?: boolean };
  };
  leaders?: { [cell: string]: { colour: Colour; dynasty: Dynasty } };
  marks?: { [cell: string]: { text: string; fill?: string } };
  /** A diamond on the uniting tile. */
  uniting?: string;
};

const CELL = 36;

export default function MiniBoard({
  spec,
  caption,
}: {
  spec: MiniSpec;
  caption: string;
}) {
  const tiles = spec.tiles || {};
  const leaders = spec.leaders || {};
  const found = components({
    tiles,
    leaders: Object.fromEntries(
      Object.entries(leaders).map(([cell, l]) => [
        cell,
        { email: l.dynasty, colour: l.colour },
      ]),
    ),
  });
  const outlines: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (const comp of found.comps) {
    if (!isKingdom(comp)) continue;
    for (const cell of comp.cells) {
      const [r, c] = cell.split("_").map(Number);
      const x = c * CELL;
      const y = r * CELL;
      const edge = (rr: number, cc: number) =>
        found.at[`${rr}_${cc}`] !== comp.id;
      if (edge(r - 1, c)) outlines.push({ x1: x, y1: y, x2: x + CELL, y2: y });
      if (edge(r + 1, c))
        outlines.push({ x1: x, y1: y + CELL, x2: x + CELL, y2: y + CELL });
      if (edge(r, c - 1)) outlines.push({ x1: x, y1: y, x2: x, y2: y + CELL });
      if (edge(r, c + 1))
        outlines.push({ x1: x + CELL, y1: y, x2: x + CELL, y2: y + CELL });
    }
  }
  const W = spec.cols * CELL;
  const H = spec.rows * CELL;
  return (
    <figure style={{ margin: "4px 0 10px" }}>
      <svg
        viewBox={`-1 -1 ${W + 2} ${H + 2}`}
        width={Math.min(W, 320)}
        style={{
          display: "block",
          borderRadius: 6,
          background: "#d9c59a",
          maxWidth: "100%",
        }}
        role="img"
        aria-label={caption}
      >
        {Array.from({ length: spec.rows }, (_, r) =>
          Array.from({ length: spec.cols }, (_, c) => {
            const cell = `${r}_${c}`;
            const x = c * CELL;
            const y = r * CELL;
            const tile = tiles[cell];
            const leader = leaders[cell];
            const mark = spec.marks?.[cell];
            return (
              <g key={cell}>
                <rect
                  x={x}
                  y={y}
                  width={CELL}
                  height={CELL}
                  fill={spec.river?.includes(cell) ? "#5f9bd1" : "#e3d2a6"}
                  stroke="rgba(0,0,0,0.12)"
                />
                {spec.border?.includes(cell) && (
                  <rect
                    x={x + 1.5}
                    y={y + 1.5}
                    width={CELL - 3}
                    height={CELL - 3}
                    fill="none"
                    stroke="#b8860b"
                    strokeWidth="2"
                    strokeDasharray="4 3"
                  />
                )}
                {tile && (
                  <g>
                    <rect
                      x={x + 3}
                      y={y + 3}
                      width={CELL - 6}
                      height={CELL - 6}
                      rx="5"
                      fill={tile.down ? "#2a2622" : COLOUR_HEX[tile.colour]}
                      stroke="rgba(0,0,0,0.5)"
                      strokeWidth="1.5"
                    />
                    {!tile.down && (
                      <g transform={`translate(${x - 2} ${y - 2}) scale(0.9)`}>
                        <TileSymbol colour={tile.colour} />
                      </g>
                    )}
                    {tile.treasure && (
                      <circle
                        cx={x + CELL - 8}
                        cy={y + 8}
                        r="6"
                        fill="#f3c33c"
                        stroke="#7a5a10"
                        strokeWidth="1.5"
                      />
                    )}
                  </g>
                )}
                {leader && (
                  <g>
                    <circle
                      cx={x + CELL / 2}
                      cy={y + CELL / 2}
                      r="13"
                      fill="#fbf3e2"
                      stroke={COLOUR_HEX[leader.colour]}
                      strokeWidth="4.5"
                    />
                    <text
                      x={x + CELL / 2}
                      y={y + CELL / 2 + 5}
                      textAnchor="middle"
                      fontSize="14"
                    >
                      {DYNASTY_SYMBOL[leader.dynasty]}
                    </text>
                  </g>
                )}
                {spec.uniting === cell && (
                  <path
                    d={`M ${x + CELL / 2} ${y + 5} L ${x + CELL - 5} ${y + CELL / 2} L ${x + CELL / 2} ${y + CELL - 5} L ${x + 5} ${y + CELL / 2} Z`}
                    fill="rgba(255, 216, 107, 0.55)"
                    stroke="#7a5a10"
                    strokeWidth="2"
                  />
                )}
                {mark && (
                  <g>
                    <rect
                      x={x + CELL / 2 - 11}
                      y={y + CELL / 2 - 8}
                      width="22"
                      height="16"
                      rx="5"
                      fill={mark.fill ?? "#2e7d32"}
                      stroke="rgba(255,255,255,0.8)"
                    />
                    <text
                      x={x + CELL / 2}
                      y={y + CELL / 2 + 4}
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight="900"
                      fill="#fff"
                    >
                      {mark.text}
                    </text>
                  </g>
                )}
              </g>
            );
          }),
        )}
        {outlines.map((o, i) => (
          <line
            key={i}
            x1={o.x1}
            y1={o.y1}
            x2={o.x2}
            y2={o.y2}
            stroke="#f7d774"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        ))}
      </svg>
      <figcaption style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>
        {caption}
      </figcaption>
    </figure>
  );
}
