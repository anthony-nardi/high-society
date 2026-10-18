export type { GameStatus, LogEntry, Notification } from "@games/shared/types";
export type {
  AcquirePlayerState,
  Chain,
  ChainState,
  Merger,
  Mode,
  Phase,
  Tile,
} from "@games/acquire/types";
import type { AcquirePublicGameState } from "@games/acquire/types";

/** The client only ever sees the public half of the state. */
export type AcquireGameState = AcquirePublicGameState;
