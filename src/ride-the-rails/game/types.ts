export type { GameStatus, LogEntry, Notification } from "@games/shared/types";
export type {
  Journey,
  Leg,
  Phase,
  Railroad,
  RideResult,
  RideTheRailsPlayerState,
} from "@games/ride-the-rails/types";
import type { RideTheRailsPublicGameState } from "@games/ride-the-rails/types";

/** The client only ever sees the public half of the state. */
export type RideTheRailsGameState = RideTheRailsPublicGameState;
