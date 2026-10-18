import type { Colour, TigrisGameState } from "./types";
import {
  ALL_CELLS,
  BoardView,
  canPlaceLeader,
  canPlaceTile,
  components,
  COLOURS,
  squareCells,
  tileAt,
} from "./board";
import { kingdomsAround } from "@games/tigris/helpers/board";
import type { Highlight } from "./components/Board";
import type { Selection } from "./components/ActionPanel";

/** Spaces lit for the current selection. */
export function highlightsFor(
  gameState: TigrisGameState,
  me: string,
  selection: Selection | null,
): { [cell: string]: Highlight } {
  const out: { [cell: string]: Highlight } = {};
  if (gameState.phase === "TREASURE" && gameState.treasureOffer?.owner === me) {
    for (const cell of gameState.treasureOffer.cells) out[cell] = "offer";
    return out;
  }
  if (gameState.phase === "MONUMENT" && gameState.turnPlayer === me) {
    for (const sq of gameState.monumentOffer?.squares || [])
      for (const cell of squareCells(sq)) out[cell] = "square";
    return out;
  }
  if (
    gameState.phase !== "ACTION" ||
    gameState.activePlayer !== me ||
    !selection
  )
    return out;
  if (selection.kind === "tile") {
    const found = components(gameState);
    for (const cell of ALL_CELLS)
      if (canPlaceTile(gameState, cell, selection.colour, found).ok)
        out[cell] = "legal";
  } else if (selection.kind === "leader") {
    const view = withoutLeader(gameState, me, selection.colour);
    const found = components(view);
    for (const cell of ALL_CELLS)
      if (cell !== view.current && canPlaceLeader(view, cell, found).ok)
        out[cell] = "legal";
  } else if (selection.kind === "catastrophe") {
    for (const cell of ALL_CELLS) {
      const t = tileAt(gameState, cell);
      const leader = gameState.leaders?.[cell];
      const blocked = (gameState.blocked || []).includes(cell);
      if (!leader && !blocked && (!t || (!t.treasure && !t.down)))
        out[cell] = "legal";
    }
  }
  return out;
}

/** The board with one of my leaders lifted off it, for judging where it may go. */
function withoutLeader(
  gameState: TigrisGameState,
  me: string,
  colour: Colour,
): BoardView & { current?: string } {
  const view: BoardView & { current?: string } = {
    tiles: gameState.tiles,
    leaders: { ...(gameState.leaders || {}) },
    blocked: gameState.blocked,
  };
  const current = Object.entries(view.leaders || {}).find(
    ([, l]) => l.email === me && l.colour === colour,
  )?.[0];
  if (current && view.leaders) delete view.leaders[current];
  view.current = current;
  return view;
}

export type Mark = {
  text: string;
  tone: "good" | "bad" | "war" | "unite";
  title: string;
};

/**
 * What a lit space would do: the point a tile earns and for whom, the
 * kingdoms it unites and whether that means war, the revolt a leader
 * would start, the treasures a trader would reach.
 */
export function marksFor(
  gameState: TigrisGameState,
  me: string,
  selection: Selection | null,
  lit: { [cell: string]: Highlight },
): { [cell: string]: Mark } {
  const out: { [cell: string]: Mark } = {};
  if (
    gameState.phase !== "ACTION" ||
    gameState.activePlayer !== me ||
    !selection
  )
    return out;
  if (selection.kind === "tile") {
    const found = components(gameState);
    for (const cell of Object.keys(lit)) {
      const kingdoms = kingdomsAround(gameState, cell, found);
      if (kingdoms.length === 2) {
        const clash = COLOURS.filter(
          (c) =>
            kingdoms[0].leaders.some((l) => l.colour === c) &&
            kingdoms[1].leaders.some((l) => l.colour === c),
        );
        out[cell] = clash.length
          ? { text: "⚔", tone: "war", title: "Unites two kingdoms: war" }
          : {
              text: "∪",
              tone: "unite",
              title: "Unites two kingdoms, no point",
            };
      } else if (kingdoms.length === 1) {
        const k = kingdoms[0];
        const taker =
          k.leaders.find((l) => l.colour === selection.colour) ??
          k.leaders.find((l) => l.colour === "BLACK");
        if (taker)
          out[cell] =
            taker.email === me
              ? { text: "+1", tone: "good", title: "A point for you" }
              : { text: "+1", tone: "bad", title: "A point for a rival" };
      }
    }
  } else if (selection.kind === "leader") {
    const view = withoutLeader(gameState, me, selection.colour);
    const found = components(view);
    for (const cell of Object.keys(lit)) {
      const kingdoms = kingdomsAround(view, cell, found);
      const k = kingdoms[0];
      if (
        k?.leaders.some((l) => l.colour === selection.colour && l.email !== me)
      ) {
        out[cell] = {
          text: "⚔",
          tone: "war",
          title: "A revolt against the leader there",
        };
        continue;
      }
      if (selection.colour === "GREEN") {
        // Treasures in the groups this seat would join.
        const seen = new Set<number>();
        let treasures = 0;
        for (const n of [cell, ...neighboursOf(cell)]) {
          const id = found.at[n];
          if (id === undefined || seen.has(id)) continue;
          seen.add(id);
          treasures += found.comps[id].cells.filter(
            (c) => tileAt(view, c)?.treasure,
          ).length;
        }
        if (treasures >= 2)
          out[cell] = { text: "★", tone: "good", title: "Treasures to take" };
      }
    }
  }
  return out;
}

function neighboursOf(cell: string) {
  const [r, c] = cell.split("_").map(Number);
  return [`${r - 1}_${c}`, `${r + 1}_${c}`, `${r}_${c - 1}`, `${r}_${c + 1}`];
}
