export type { GameStatus, LogEntry, Notification } from "@games/shared/types";
export type {
  Breakdown,
  CardType,
  EcosystemPlayerState,
  Grid,
  Neutral,
} from "@games/ecosystem/types";
import type { EcosystemPublicGameState } from "@games/ecosystem/types";

/** The client only ever sees the public half of the state. */
export type EcosystemGameState = EcosystemPublicGameState;
