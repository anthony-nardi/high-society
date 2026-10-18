export type { GameStatus, LogEntry, Notification } from "@games/shared/types";
export type { Link, Side, TwixtPlayerState } from "@games/twixt/types";
import type { TwixtPublicGameState } from "@games/twixt/types";

/** The client only ever sees the public half of the state. */
export type TwixtGameState = TwixtPublicGameState;
