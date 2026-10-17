export type { GameStatus, LogEntry, Notification } from "@games/shared/types";
export type { HighSocietyPlayerState } from "@games/high-society/types";
import type { PublicGameState } from "@games/high-society/types";

/** The client only ever sees the public half of the state. */
export type HighSocietyGameState = PublicGameState;
