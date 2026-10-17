export type { GameStatus, LogEntry, Notification } from "@games/shared/types";
export type { ForSalePlayerState, Phase, Sale } from "@games/for-sale/types";
import type { ForSalePublicGameState } from "@games/for-sale/types";

/** The client only ever sees the public half of the state. */
export type ForSaleGameState = ForSalePublicGameState;
