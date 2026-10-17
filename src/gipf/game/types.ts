export type { GameStatus, LogEntry, Notification } from "@games/shared/types";
export type { Coord, GipfPlayerState, Phase, Side } from "@games/gipf/types";
import type { GipfPublicGameState } from "@games/gipf/types";

/** The client only ever sees the public half of the state. */
export type GipfGameState = GipfPublicGameState;
