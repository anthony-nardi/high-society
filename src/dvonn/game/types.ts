export type { GameStatus, LogEntry, Notification } from "@games/shared/types";
export type {
  Coord,
  DvonnPlayerState,
  Phase,
  Piece,
  Side,
} from "@games/dvonn/types";
import type { DvonnPublicGameState } from "@games/dvonn/types";

/** The client only ever sees the public half of the state. */
export type DvonnGameState = DvonnPublicGameState;
