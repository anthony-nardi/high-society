/* The bot as first shipped, kept as the arena opponent. Do not edit. */
import { Colour, TigrisGameState, TigrisPlayerState } from "../../types";
import {
  ALL_CELLS,
  BoardView,
  canPlaceLeader,
  canPlaceTile,
  COLOURS,
  components,
  finalSpheres,
  isEmptyCell,
  isKingdom,
  kingdomsAround,
  leaderAt,
  neighbours,
  supporters,
  templesAdjacent,
  TILE_COUNTS,
  tileAt,
} from "../board";
import {
  buildMonument,
  chooseWar,
  commitTiles,
  countInHand,
  endTurn,
  getActivePlayer,
  leaderCellOf,
  placeTile,
  playCatastrophe,
  positionLeader,
  replaceTiles,
  skipMonument,
  takeTreasure,
  withdrawLeader,
} from "../rules";

/*
 * The bot's judgement. Every legal action is tried on a copy of the game,
 * the conflicts it starts are fought out with sensible commitments (the
 * bot's own hand for itself, a guess for everyone else), and the result is
 * valued: the lowest sphere above all, leaders in place with supporters
 * and monuments beside them, less what the strongest rival stands to gain.
 */

export type BotMove =
  | { type: "TILE"; cell: string; colour: Colour }
  | { type: "LEADER"; colour: Colour; cell: string }
  | { type: "WITHDRAW"; colour: Colour }
  | { type: "CATASTROPHE"; cell: string }
  | { type: "REPLACE"; indexes: number[] }
  | { type: "END" }
  | { type: "COMMIT"; count: number }
  | { type: "WAR"; colour: Colour }
  | { type: "MONUMENT"; cell: string; colours: [Colour, Colour] }
  | { type: "SKIP_MONUMENT" }
  | { type: "TREASURE"; cell: string };

const pub = (s: TigrisGameState) => s.public;

/** Cells next to something on the board: where a tile does anything. */
function nearCells(board: BoardView) {
  const near = new Set<string>();
  for (const cell of Object.keys(board.tiles || {}).concat(
    Object.keys(board.leaders || {}),
  ))
    for (const n of neighbours(cell)) if (isEmptyCell(board, n)) near.add(n);
  return [...near];
}

export function turnMoves(gameState: TigrisGameState): BotMove[] {
  const board = pub(gameState);
  if (board.status !== "IN_PROGRESS") return [];
  const player = getActivePlayer(gameState);
  if (!player) return [];
  const out: BotMove[] = [];
  switch (board.phase) {
    case "ACTION": {
      const found = components(board);
      const cells = nearCells(board);
      for (const colour of new Set(player.hand || []))
        for (const cell of cells)
          if (canPlaceTile(board, cell, colour, found).ok)
            out.push({ type: "TILE", cell, colour });
      for (const colour of COLOURS) {
        const current = leaderCellOf(board, player.email, colour);
        const view: BoardView = {
          tiles: board.tiles,
          leaders: { ...(board.leaders || {}) },
          blocked: board.blocked,
        };
        if (current && view.leaders) delete view.leaders[current];
        const viewFound = components(view);
        for (const cell of ALL_CELLS)
          if (cell !== current && canPlaceLeader(view, cell, viewFound).ok)
            out.push({ type: "LEADER", colour, cell });
        if (current) out.push({ type: "WITHDRAW", colour });
      }
      if (player.catastrophes > 0)
        for (const cell of Object.keys(board.tiles || {})) {
          const t = tileAt(board, cell);
          if (t && !t.treasure && !t.down && !leaderAt(board, cell))
            out.push({ type: "CATASTROPHE", cell });
        }
      if ((player.hand || []).length)
        out.push({ type: "REPLACE", indexes: [0] });
      out.push({ type: "END" });
      return out;
    }
    case "CONFLICT": {
      const c = board.conflict;
      if (!c) return [];
      const n = countInHand(player, c.colour);
      for (let count = 0; count <= n; count++)
        out.push({ type: "COMMIT", count });
      return out;
    }
    case "WAR_CHOICE":
      return (board.warChoices || []).map((colour) => ({
        type: "WAR",
        colour,
      }));
    case "MONUMENT": {
      const offer = board.monumentOffer;
      if (!offer) return [];
      for (const cell of offer.squares)
        for (const pair of board.monumentsLeft || [])
          if (pair.includes(offer.colour))
            out.push({ type: "MONUMENT", cell, colours: pair });
      out.push({ type: "SKIP_MONUMENT" });
      return out;
    }
    case "TREASURE":
      return (board.treasureOffer?.cells || []).map((cell) => ({
        type: "TREASURE",
        cell,
      }));
  }
  return out;
}

export function applyMove(gameState: TigrisGameState, move: BotMove) {
  const email = pub(gameState).activePlayer;
  switch (move.type) {
    case "TILE":
      return placeTile(gameState, move.cell, move.colour);
    case "LEADER":
      return positionLeader(gameState, move.colour, move.cell);
    case "WITHDRAW":
      return withdrawLeader(gameState, move.colour);
    case "CATASTROPHE":
      return playCatastrophe(gameState, move.cell);
    case "REPLACE":
      return replaceTiles(gameState, move.indexes);
    case "END":
      return endTurn(gameState);
    case "COMMIT":
      return commitTiles(gameState, email, move.count);
    case "WAR":
      return chooseWar(gameState, move.colour);
    case "MONUMENT":
      return buildMonument(gameState, move.cell, move.colours);
    case "SKIP_MONUMENT":
      return skipMonument(gameState);
    case "TREASURE":
      return takeTreasure(gameState, email, move.cell);
  }
}

// ---------------------------------------------------------------------------
// Valuing a position
// ---------------------------------------------------------------------------

const SPHERE_WEIGHTS = [1, 0.5, 0.25, 0.12];

/** How much a player's position is worth to them. */
export function evaluate(gameState: TigrisGameState, email: string): number {
  const board = pub(gameState);
  const player = board.players.find((p) => p.email === email);
  if (!player) return 0;
  const spheres = finalSpheres(player.points, player.treasures);
  let value = spheres.reduce((s, n, i) => s + n * SPHERE_WEIGHTS[i], 0);
  const found = components(board);
  const empties = ALL_CELLS.filter((c) => isEmptyCell(board, c));

  for (const [cell, leader] of Object.entries(board.leaders || {})) {
    if (leader.email !== email) continue;
    const comp = found.comps[found.at[cell]];
    value += 0.5;
    const mine = comp.cells.filter((c) => {
      const t = tileAt(board, c);
      return !!t && !t.down && t.colour === leader.colour;
    }).length;
    value += 0.06 * mine;
    value += 0.05 * templesAdjacent(board, cell);
    for (const m of board.monuments || [])
      if (found.at[m.cell] === comp.id && m.colours.includes(leader.colour))
        value += 0.9;
    if (leader.colour === "BLACK")
      for (const colour of COLOURS)
        if (!comp.leaders.some((l) => l.colour === colour)) value += 0.25;

    // A rival of the same colour one tile away with more supporters is a threat.
    for (const gap of empties) {
      const around = kingdomsAround(board, gap, found);
      if (around.length !== 2 || !around.some((k) => k.id === comp.id))
        continue;
      const other = around.find((k) => k.id !== comp.id);
      const rival = other?.leaders.find(
        (l) => l.colour === leader.colour && l.email !== email,
      );
      if (!rival || !other) continue;
      const theirs = supporters(board, rival.cell, leader.colour).length;
      if (theirs > mine) value -= 0.4;
    }
  }
  return value;
}

export function position(gameState: TigrisGameState, email: string) {
  const rivals = pub(gameState)
    .players.filter((p) => p.email !== email)
    .map((p) => evaluate(gameState, p.email));
  return evaluate(gameState, email) - 0.7 * Math.max(0, ...rivals);
}

// ---------------------------------------------------------------------------
// Fighting things out
// ---------------------------------------------------------------------------

const share = (colour: Colour) =>
  TILE_COUNTS[colour] / COLOURS.reduce((s, c) => s + TILE_COUNTS[c], 0);

/** Tiles of a colour a rival probably holds. */
const expectedInHand = (player: TigrisPlayerState, colour: Colour) =>
  Math.round((player.hand || []).length * share(colour));

/** How many tiles to commit: enough to win if that is affordable, else none. */
export function chooseCommit(
  gameState: TigrisGameState,
  email: string,
  available: number,
) {
  const c = pub(gameState).conflict;
  if (!c) return 0;
  const attacking = c.attacker === email;
  if (attacking) {
    const defender = pub(gameState).players.find((p) => p.email === c.defender);
    const theirs =
      c.defenderBase +
      (defender ? Math.min(expectedInHand(defender, c.colour), 2) : 0);
    const need = theirs + 1 - c.attackerBase;
    return need <= 0 ? 0 : need <= available ? need : 0;
  }
  const need = c.attackerBase + (c.attackerCommit || 0) - c.defenderBase;
  return need <= 0 ? 0 : need <= available ? need : 0;
}

function hasLeaderIn(
  board: BoardView,
  email: string,
  colours: Colour[],
  cells: string[],
) {
  const found = components(board);
  const ids = new Set(cells.map((c) => found.at[c]));
  return Object.entries(board.leaders || {}).some(
    ([cell, l]) =>
      l.email === email &&
      colours.includes(l.colour) &&
      ids.has(found.at[cell]),
  );
}

/** Plays the pending phases of a copy with plausible choices until an action is due. */
export function settle(gameState: TigrisGameState, me: string) {
  const board = pub(gameState);
  for (let guard = 0; guard < 24; guard++) {
    if (board.status !== "IN_PROGRESS" || board.phase === "ACTION") return;
    const active = board.activePlayer;
    const player = board.players.find((p) => p.email === active);
    if (!player) return;
    switch (board.phase) {
      case "CONFLICT": {
        const c = board.conflict;
        if (!c) return;
        const have = countInHand(player, c.colour);
        const cap =
          active === me
            ? have
            : Math.min(have, expectedInHand(player, c.colour));
        commitTiles(gameState, active, chooseCommit(gameState, active, cap));
        break;
      }
      case "WAR_CHOICE": {
        const choices = board.warChoices || [];
        chooseWar(gameState, bestWar(gameState, active) ?? choices[0]);
        break;
      }
      case "MONUMENT": {
        const offer = board.monumentOffer;
        if (!offer) return;
        const choice = pickMonument(gameState, active);
        if (choice) buildMonument(gameState, choice.cell, choice.colours);
        else skipMonument(gameState);
        break;
      }
      case "TREASURE":
        takeTreasure(gameState, active, board.treasureOffer?.cells[0] ?? "");
        break;
      default:
        return;
    }
  }
}

/** The war the chooser is likeliest to win, or the first if not involved. */
export function bestWar(gameState: TigrisGameState, email: string) {
  const board = pub(gameState);
  const uniting = board.unification;
  if (!uniting) return undefined;
  const found = components(board);
  const comp = found.comps[found.at[uniting]];
  let best: { colour: Colour; edge: number } | undefined;
  for (const colour of board.warChoices || []) {
    const mine = comp.leaders.find(
      (l) => l.colour === colour && l.email === email,
    );
    const theirs = comp.leaders.find(
      (l) => l.colour === colour && l.email !== email,
    );
    if (!mine || !theirs) continue;
    const edge =
      supporters(board, mine.cell, colour, uniting).length +
      countInHand(
        board.players.find((p) => p.email === email) ?? ({ hand: [] } as never),
        colour,
      ) -
      supporters(board, theirs.cell, colour, uniting).length;
    if (!best || edge > best.edge) best = { colour, edge };
  }
  return best?.colour;
}

/** A monument is worth building when one of your leaders will be paid by it. */
export function pickMonument(gameState: TigrisGameState, email: string) {
  const board = pub(gameState);
  const offer = board.monumentOffer;
  if (!offer) return null;
  let best: { cell: string; colours: [Colour, Colour]; score: number } | null =
    null;
  for (const cell of offer.squares)
    for (const pair of board.monumentsLeft || []) {
      if (!pair.includes(offer.colour)) continue;
      const square = [cell];
      let score = 0;
      for (const colour of pair)
        if (hasLeaderIn(board, email, [colour], square)) score += 1;
      if (!best || score > best.score) best = { cell, colours: pair, score };
    }
  return best && best.score > 0 ? best : null;
}

// ---------------------------------------------------------------------------
// Choosing an action
// ---------------------------------------------------------------------------

const clone = (s: TigrisGameState) =>
  JSON.parse(JSON.stringify(s)) as TigrisGameState;

function valueAfter(gameState: TigrisGameState, me: string, move: BotMove) {
  const copy = clone(gameState);
  const result = applyMove(copy, move);
  if (!result?.ok) return Number.NEGATIVE_INFINITY;
  settle(copy, me);
  return position(copy, me);
}

export function chooseMove(gameState: TigrisGameState): BotMove | null {
  const board = pub(gameState);
  const me = board.activePlayer;
  const player = board.players.find((p) => p.email === me);
  if (!player) return null;

  switch (board.phase) {
    case "CONFLICT": {
      const c = board.conflict;
      if (!c) return null;
      return {
        type: "COMMIT",
        count: chooseCommit(gameState, me, countInHand(player, c.colour)),
      };
    }
    case "WAR_CHOICE":
      return {
        type: "WAR",
        colour: bestWar(gameState, me) ?? (board.warChoices || [])[0],
      };
    case "MONUMENT": {
      const pick = pickMonument(gameState, me);
      return pick
        ? { type: "MONUMENT", cell: pick.cell, colours: pick.colours }
        : { type: "SKIP_MONUMENT" };
    }
    case "TREASURE":
      return { type: "TREASURE", cell: board.treasureOffer?.cells[0] ?? "" };
    default:
      break;
  }

  const now = position(gameState, me);
  let best: { move: BotMove; value: number } = {
    move: { type: "END" },
    value: now - 0.05,
  };
  const consider = (move: BotMove, bonus = 0) => {
    const value = valueAfter(gameState, me, move) + bonus;
    if (value > best.value) best = { move, value };
  };
  for (const move of turnMoves(gameState)) {
    if (move.type === "END" || move.type === "REPLACE") continue;
    if (move.type === "CATASTROPHE") {
      consider(move, -1.4);
      continue;
    }
    if (move.type === "WITHDRAW") {
      consider(move, -0.3);
      continue;
    }
    consider(move);
  }

  // Nothing worth doing: freshen a hand heavy with one colour, else end the turn.
  if (best.move.type === "END") {
    const hand = player.hand || [];
    const counts = COLOURS.map((c) => hand.filter((h) => h === c).length);
    const heavy = Math.max(...counts);
    if (heavy >= 3) {
      const colour = COLOURS[counts.indexOf(heavy)];
      const indexes: number[] = [];
      hand.forEach((h, i) => {
        if (h === colour && indexes.length < heavy - 1) indexes.push(i);
      });
      if (indexes.length) return { type: "REPLACE", indexes };
    }
  }
  return best.move;
}

export const isKingdomAt = (board: BoardView, cell: string) => {
  const found = components(board);
  const id = found.at[cell];
  return id !== undefined && isKingdom(found.comps[id]);
};
