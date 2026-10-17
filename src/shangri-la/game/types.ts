export type { GameStatus, LogEntry, Notification } from "@games/shared/types";
export type {
  Arrival,
  Colour,
  Master,
  Phase,
  ShangriLaPlayerState,
  Space,
  Village,
} from "@games/shangri-la/types";
import type { ShangriLaPublicGameState } from "@games/shangri-la/types";

/** The client only ever sees the public half of the state. */
export type ShangriLaGameState = ShangriLaPublicGameState;
