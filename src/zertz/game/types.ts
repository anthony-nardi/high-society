export type {
  GameStatus,
  LogEntry,
  Notification,
} from "@games/shared/types";
export type {
  Colour,
  Coord,
  MarbleCounts,
  Phase,
  ZertzPlayerState,
} from "@games/zertz/types";
export { COLOURS } from "@games/zertz/types";
import type { ZertzPublicGameState } from "@games/zertz/types";

/** The client only ever sees the public half of the state. */
export type ZertzGameState = ZertzPublicGameState;
