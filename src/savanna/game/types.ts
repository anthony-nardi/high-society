export type { GameStatus, LogEntry, Notification } from "@games/shared/types";
export type {
  Breakdown,
  CardType,
  Grid,
  Neutral,
  SavannaPlayerState,
} from "@games/savanna/types";
import type { SavannaPublicGameState } from "@games/savanna/types";

/** The client only ever sees the public half of the state. */
export type SavannaGameState = SavannaPublicGameState;
