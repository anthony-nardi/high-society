export type { GameStatus, LogEntry, Notification } from "@games/shared/types";
export type {
  Bank,
  Card,
  Colour,
  DieFace,
  Phase,
  PushPlayerState,
  Roll,
  Take,
} from "@games/push/types";
import type { PushPublicGameState } from "@games/push/types";

/** The client only ever sees the public half of the state. */
export type PushGameState = PushPublicGameState;
