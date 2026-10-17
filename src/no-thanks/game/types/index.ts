export type { GameStatus, LogEntry, Notification } from "@games/shared/types";
export type { NoThanksPlayerState } from "@games/no-thanks/types";
import type { NoThanksPublicGameState } from "@games/no-thanks/types";

/** The client only ever sees the public half of the state. */
export type NoThanksGameState = NoThanksPublicGameState;
