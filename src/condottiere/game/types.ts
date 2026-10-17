export type { GameStatus, LogEntry, Notification } from "@games/shared/types";
export type {
  BattleResult,
  Card,
  CondottierePlayerState,
  Phase,
  Season,
} from "@games/condottiere/types";
import type { CondottierePublicGameState } from "@games/condottiere/types";

/** The client only ever sees the public half of the state. */
export type CondottiereGameState = CondottierePublicGameState;
