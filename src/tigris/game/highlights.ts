import { TigrisGameState } from "./types";
import {
  ALL_CELLS,
  BoardView,
  canPlaceLeader,
  canPlaceTile,
  components,
  squareCells,
  tileAt,
} from "./board";
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
    const view: BoardView = {
      tiles: gameState.tiles,
      leaders: { ...(gameState.leaders || {}) },
      blocked: gameState.blocked,
    };
    const current = Object.entries(view.leaders || {}).find(
      ([, l]) => l.email === me && l.colour === selection.colour,
    )?.[0];
    if (current && view.leaders) delete view.leaders[current];
    const found = components(view);
    for (const cell of ALL_CELLS)
      if (cell !== current && canPlaceLeader(view, cell, found).ok)
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
