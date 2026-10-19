export type { GameStatus, LogEntry, Notification } from "@games/shared/types";
export type {
  Card,
  Commodity,
  DayScoring,
  LastAuction,
  MediciPlayerState,
  Phase,
  ShipResult,
  TrackResult,
} from "@games/medici/types";
import type { MediciPublicGameState } from "@games/medici/types";

/** The client only ever sees the public half of the state. */
export type MediciGameState = MediciPublicGameState;
