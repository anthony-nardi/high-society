export type { GameStatus, LogEntry, Notification } from "@games/shared/types";
export type {
  Colour,
  Conflict,
  ConflictResult,
  Dynasty,
  LastAction,
  Leader,
  Monument,
  Phase,
  Points,
  Result,
  TigrisPlayerState,
  Tile,
} from "@games/tigris/types";
import type { TigrisPublicGameState } from "@games/tigris/types";

/** The client only ever sees the public half of the state. */
export type TigrisGameState = TigrisPublicGameState;
