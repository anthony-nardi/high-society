export type { GameStatus, LogEntry, Notification } from "@games/shared/types";
export type {
  Breakdown,
  CardType,
  CoralReefPlayerState,
  FoodWebGroup,
  Grid,
  Neutral,
} from "@games/coral-reef/types";
import type { CoralReefPublicGameState } from "@games/coral-reef/types";

/** The client only ever sees the public half of the state. */
export type CoralReefGameState = CoralReefPublicGameState;
