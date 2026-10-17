export type { GameStatus, LogEntry, Notification } from "@games/shared/types";
export type { Coord, Phase, Side, YinshPlayerState } from "@games/yinsh/types";
import type { YinshPublicGameState } from "@games/yinsh/types";

/** The client only ever sees the public half of the state. */
export type YinshGameState = YinshPublicGameState;
