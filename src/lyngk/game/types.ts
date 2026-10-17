export type { GameStatus, LogEntry, Notification } from "@games/shared/types";
export type {
  Colour,
  Coord,
  LyngkPlayerState,
  LyngkScore,
  Piece,
} from "@games/lyngk/types";
import type { LyngkPublicGameState } from "@games/lyngk/types";

/** The client only ever sees the public half of the state. */
export type LyngkGameState = LyngkPublicGameState;
