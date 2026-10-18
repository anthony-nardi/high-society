export type { GameStatus, LogEntry, Notification } from "@games/shared/types";
export type {
  ClansPlayerState,
  Colour,
  Huts,
  Terrain,
  Village,
} from "@games/clans/types";
import type { ClansPublicGameState } from "@games/clans/types";

/** The client only ever sees the public half of the state. */
export type ClansGameState = ClansPublicGameState;
