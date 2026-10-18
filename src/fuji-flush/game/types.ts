export type { GameStatus, LogEntry, Notification } from "@games/shared/types";
export type {
  Flush,
  FujiFlushPlayerState,
  LastPlay,
  LastPush,
} from "@games/fuji-flush/types";
import type { FujiFlushPublicGameState } from "@games/fuji-flush/types";

/** The client only ever sees the public half of the state. */
export type FujiFlushGameState = FujiFlushPublicGameState;
