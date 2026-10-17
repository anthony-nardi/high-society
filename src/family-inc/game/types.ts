export type {
  GameStatus,
  LogEntry,
  Notification,
} from "@games/shared/types";
export type {
  ChipCounts,
  ChipValue,
  FamilyIncPlayerState,
  TurnOutcome,
} from "@games/family-inc/types";
export { CHIP_VALUES } from "@games/family-inc/types";
import type { FamilyIncPublicGameState } from "@games/family-inc/types";

/** The client only ever sees the public half of the state. */
export type FamilyIncGameState = FamilyIncPublicGameState;
