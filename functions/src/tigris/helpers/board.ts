/*
 * The standard Tigris & Euphrates board and the geometry of kingdoms. No
 * imports: the client bundles this file to light up legal spaces.
 *
 * Cells are "row_col" on a 16 by 11 grid. The river course, the ten Shedu
 * spaces and the four special-border spaces are those of the gold-bordered
 * standard board.
 */

export type Colour = "RED" | "BLUE" | "GREEN" | "BLACK";
export const COLOURS: Colour[] = ["RED", "BLUE", "GREEN", "BLACK"];

export const COLS = 16;
export const ROWS = 11;
export const HAND_SIZE = 6;
export const CATASTROPHES = 2;
export const ACTIONS_PER_TURN = 2;

/** Tiles in the box; ten temples start on the board. */
export const TILE_COUNTS: { [colour in Colour]: number } = {
  RED: 57,
  BLUE: 36,
  GREEN: 30,
  BLACK: 30,
};

export const TILE_NAME: { [colour in Colour]: string } = {
  RED: "temple",
  BLUE: "farm",
  GREEN: "market",
  BLACK: "settlement",
};
export const LEADER_NAME: { [colour in Colour]: string } = {
  RED: "priest",
  BLUE: "farmer",
  GREEN: "trader",
  BLACK: "king",
};
export const POINT_NAME: { [colour in Colour]: string } = {
  RED: "amulet",
  BLUE: "crop",
  GREEN: "good",
  BLACK: "brick",
};

export const key = (row: number, col: number) => `${row}_${col}`;
export function parse(cell: string): [number, number] {
  const [r, c] = cell.split("_").map(Number);
  return [r, c];
}
export const inBounds = (row: number, col: number) =>
  row >= 0 && row < ROWS && col >= 0 && col < COLS;
/** "A1" to "P11": columns lettered, rows numbered. */
export function label(cell: string) {
  const [r, c] = parse(cell);
  return `${String.fromCharCode(65 + c)}${r + 1}`;
}

export function neighbours(cell: string): string[] {
  const [r, c] = parse(cell);
  const out: string[] = [];
  if (r > 0) out.push(key(r - 1, c));
  if (r < ROWS - 1) out.push(key(r + 1, c));
  if (c > 0) out.push(key(r, c - 1));
  if (c < COLS - 1) out.push(key(r, c + 1));
  return out;
}

export const ALL_CELLS: string[] = [];
for (let r = 0; r < ROWS; r++)
  for (let c = 0; c < COLS; c++) ALL_CELLS.push(key(r, c));

/** River spaces as (col, row): the Euphrates in the top left, the Tigris winding across. */
const RIVER_XY: [number, number][] = [
  [0, 3],
  [1, 3],
  [2, 3],
  [3, 3],
  [3, 2],
  [4, 2],
  [4, 1],
  [4, 0],
  [5, 0],
  [6, 0],
  [7, 0],
  [8, 0],
  [12, 0],
  [12, 1],
  [12, 2],
  [13, 2],
  [13, 3],
  [14, 3],
  [15, 3],
  [15, 4],
  [14, 4],
  [14, 5],
  [14, 6],
  [13, 6],
  [12, 6],
  [12, 7],
  [12, 8],
  [11, 8],
  [10, 8],
  [9, 8],
  [8, 8],
  [7, 8],
  [6, 8],
  [6, 7],
  [5, 7],
  [4, 7],
  [3, 7],
  [3, 6],
  [2, 6],
  [1, 6],
  [0, 6],
];
export const RIVER: string[] = RIVER_XY.map(([c, r]) => key(r, c));
const riverSet = new Set(RIVER);
export const isRiver = (cell: string) => riverSet.has(cell);

/** The ten Shedu spaces: a temple with a treasure on each at the start. */
export const SHEDU: string[] = (
  [
    [1, 1],
    [10, 0],
    [5, 2],
    [15, 1],
    [13, 4],
    [8, 6],
    [1, 7],
    [14, 8],
    [5, 9],
    [10, 10],
  ] as [number, number][]
).map(([c, r]) => key(r, c));

/** Special-border spaces: their treasures must be taken first. */
export const BORDER: string[] = (
  [
    [1, 1],
    [15, 1],
    [14, 8],
    [1, 7],
  ] as [number, number][]
).map(([c, r]) => key(r, c));
const borderSet = new Set(BORDER);
export const isBorder = (cell: string) => borderSet.has(cell);

export const MONUMENT_PAIRS: [Colour, Colour][] = [
  ["RED", "BLUE"],
  ["BLACK", "GREEN"],
  ["BLACK", "BLUE"],
  ["BLUE", "GREEN"],
  ["GREEN", "RED"],
  ["BLACK", "RED"],
];

export type Tile = {
  colour: Colour;
  /** Facedown under a monument: still links, counts for nothing else. */
  down?: boolean;
  treasure?: boolean;
};
export type Leader = { email: string; colour: Colour };

/** What the geometry needs: the client's public state satisfies it. */
export type BoardView = {
  tiles?: { [cell: string]: Tile };
  leaders?: { [cell: string]: Leader };
  blocked?: string[];
};

export const tileAt = (board: BoardView, cell: string) => board.tiles?.[cell];
export const leaderAt = (board: BoardView, cell: string) =>
  board.leaders?.[cell];
export const isBlocked = (board: BoardView, cell: string) =>
  (board.blocked || []).includes(cell);
export const isEmptyCell = (board: BoardView, cell: string) =>
  !tileAt(board, cell) && !leaderAt(board, cell) && !isBlocked(board, cell);
export const isTemple = (board: BoardView, cell: string) => {
  const t = tileAt(board, cell);
  return !!t && t.colour === "RED" && !t.down;
};
export const templesAdjacent = (board: BoardView, cell: string) =>
  neighbours(cell).filter((n) => isTemple(board, n)).length;

export type Component = {
  id: number;
  cells: string[];
  leaders: { cell: string; email: string; colour: Colour }[];
};
export const isKingdom = (comp: Component) => comp.leaders.length > 0;

/**
 * Regions and kingdoms: the connected groups of tiles and leaders,
 * optionally with one cell left out (the uniting tile during a war).
 */
export function components(
  board: BoardView,
  exclude?: string,
): { comps: Component[]; at: { [cell: string]: number } } {
  const at: { [cell: string]: number } = {};
  const comps: Component[] = [];
  const occupied = (cell: string) =>
    cell !== exclude && (!!tileAt(board, cell) || !!leaderAt(board, cell));
  for (const start of Object.keys(board.tiles || {}).concat(
    Object.keys(board.leaders || {}),
  )) {
    if (at[start] !== undefined || !occupied(start)) continue;
    const id = comps.length;
    const comp: Component = { id, cells: [], leaders: [] };
    const queue = [start];
    at[start] = id;
    while (queue.length) {
      const cell = queue.shift() as string;
      comp.cells.push(cell);
      const leader = leaderAt(board, cell);
      if (leader) comp.leaders.push({ cell, ...leader });
      for (const n of neighbours(cell)) {
        if (at[n] !== undefined || !occupied(n)) continue;
        at[n] = id;
        queue.push(n);
      }
    }
    comps.push(comp);
  }
  return { comps, at };
}

/** Distinct kingdoms touching a cell. */
export function kingdomsAround(
  board: BoardView,
  cell: string,
  found = components(board),
): Component[] {
  const seen = new Set<number>();
  const out: Component[] = [];
  for (const n of neighbours(cell)) {
    const id = found.at[n];
    if (id === undefined || seen.has(id)) continue;
    seen.add(id);
    if (isKingdom(found.comps[id])) out.push(found.comps[id]);
  }
  return out;
}

export type Legality = { ok: true } | { ok: false; reason: string };

export function canPlaceTile(
  board: BoardView,
  cell: string,
  colour: Colour,
  found = components(board),
): Legality {
  const [r, c] = parse(cell);
  if (!inBounds(r, c)) return { ok: false, reason: "That is off the board." };
  if (!isEmptyCell(board, cell))
    return { ok: false, reason: "That space is taken." };
  if (colour === "BLUE" && !isRiver(cell))
    return { ok: false, reason: "Farms go on the river." };
  if (colour !== "BLUE" && isRiver(cell))
    return { ok: false, reason: "Only farms go on the river." };
  if (kingdomsAround(board, cell, found).length > 2)
    return { ok: false, reason: "A tile cannot unite three kingdoms." };
  return { ok: true };
}

export function canPlaceLeader(
  board: BoardView,
  cell: string,
  found = components(board),
): Legality {
  const [r, c] = parse(cell);
  if (!inBounds(r, c)) return { ok: false, reason: "That is off the board." };
  if (!isEmptyCell(board, cell))
    return { ok: false, reason: "That space is taken." };
  if (isRiver(cell))
    return { ok: false, reason: "Leaders cannot stand on the river." };
  if (templesAdjacent(board, cell) === 0)
    return { ok: false, reason: "A leader must stand next to a temple." };
  if (kingdomsAround(board, cell, found).length > 1)
    return { ok: false, reason: "A leader cannot unite kingdoms." };
  return { ok: true };
}

/** Top-left cells of the 2x2 squares of one faceup colour that include a cell. */
export function squaresAt(board: BoardView, cell: string): string[] {
  const tile = tileAt(board, cell);
  if (!tile || tile.down) return [];
  const [r, c] = parse(cell);
  const same = (rr: number, cc: number) => {
    if (!inBounds(rr, cc)) return false;
    const t = tileAt(board, key(rr, cc));
    return !!t && !t.down && t.colour === tile.colour;
  };
  const out: string[] = [];
  for (const dr of [-1, 0])
    for (const dc of [-1, 0]) {
      const top = r + dr;
      const left = c + dc;
      if (
        same(top, left) &&
        same(top, left + 1) &&
        same(top + 1, left) &&
        same(top + 1, left + 1)
      )
        out.push(key(top, left));
    }
  return out;
}

export const squareCells = (topLeft: string) => {
  const [r, c] = parse(topLeft);
  return [key(r, c), key(r, c + 1), key(r + 1, c), key(r + 1, c + 1)];
};

/** Faceup tiles of a colour linked to a leader, with one cell left out of the links. */
export function supporters(
  board: BoardView,
  leaderCell: string,
  colour: Colour,
  exclude?: string,
): string[] {
  const found = components(board, exclude);
  const id = found.at[leaderCell];
  if (id === undefined) return [];
  return found.comps[id].cells.filter((cell) => {
    const t = tileAt(board, cell);
    return !!t && !t.down && t.colour === colour;
  });
}

/** Spheres lowest first, with treasures spent one at a time on the lowest. */
export function finalSpheres(
  points: { [colour in Colour]: number },
  treasures: number,
): number[] {
  const spheres = COLOURS.map((c) => points[c] || 0).sort((a, b) => a - b);
  for (let i = 0; i < treasures; i++) {
    spheres[0] += 1;
    spheres.sort((a, b) => a - b);
  }
  return spheres;
}

/** Positive when a beats b: lowest sphere first, then the next, and so on. */
export function compareSpheres(a: number[], b: number[]) {
  for (let i = 0; i < 4; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}
