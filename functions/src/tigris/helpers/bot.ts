import { TigrisGameState } from "../types";
import { applyMove, chooseMove } from "./botSearch";
import {
  commitTiles,
  endTurn,
  getActivePlayer,
  skipMonument,
  takeTreasure,
  chooseWar,
} from "./rules";

/** One decision for the active bot, applied in place. Pure. */
export function takeBotTurn(gameState: TigrisGameState) {
  const player = getActivePlayer(gameState);
  if (!player?.isBot) return;
  let move: ReturnType<typeof chooseMove> = null;
  try {
    move = chooseMove(gameState);
  } catch (e) {
    console.log("Bot judgement failed, falling back.", e);
  }
  if (move && applyMove(gameState, move)?.ok) return;

  // The safe way out of every phase.
  const board = gameState.public;
  switch (board.phase) {
    case "CONFLICT":
      commitTiles(gameState, player.email, 0);
      return;
    case "WAR_CHOICE":
      chooseWar(gameState, (board.warChoices || [])[0]);
      return;
    case "MONUMENT":
      skipMonument(gameState);
      return;
    case "TREASURE":
      takeTreasure(
        gameState,
        player.email,
        board.treasureOffer?.cells[0] ?? "",
      );
      return;
    default:
      endTurn(gameState);
  }
}
