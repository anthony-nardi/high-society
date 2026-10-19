import {
  GameStatus,
  GenericGameState,
  GenericPlayerState,
  LogEntry,
  Notification,
} from "../../shared/types";

export type Colour = "RED" | "BLUE" | "YELLOW" | "GREEN" | "PURPLE";

/** A numbered card as "RED_3", or the special "DICE" and "SWITCH" cards. */
export type Card = string;

/** The die: a colour, or the star that spares everything. */
export type DieFace = Colour | "STAR";

/**
 * PUSH: the player whose turn it is draws and places cards; CHOOSE: the
 * other players take the columns left over, one each.
 */
export type Phase = "PUSH" | "CHOOSE";

export type PushPlayerState = GenericPlayerState & {
  email: string;
  lastActionAt: number;
  isBot: boolean;
  /** Face-up cards in the player's zone, at the mercy of the die. Absent when empty. */
  bench?: Card[];
  /** Protected cards, safe for the rest of the game. Absent when empty. */
  bank?: Card[];
};

/** A die roll and what it cost. */
export type Roll = {
  email: string;
  face: DieFace;
  /** Why: a card that fitted nowhere, or a dice card in a column taken. */
  reason: "BUST" | "DICE";
  /** The card that could not be placed, when busting. */
  card?: Card;
  lost?: Card[];
  turn: number;
};

/** A column taken into a zone. */
export type Take = {
  email: string;
  cards: Card[];
  turn: number;
};

export type Bank = {
  email: string;
  colour: Colour;
  cards: Card[];
  turn: number;
};

export type PushPublicGameState = {
  id: string;
  game: string;
  players: PushPlayerState[];
  /** Who must act now: the pusher, or a chooser. */
  activePlayer: string;
  /** Whose turn it is. */
  turnPlayer: string;
  startAt: string;
  status: GameStatus;
  phase: Phase;
  /** Up to three columns of face-up cards. Absent while the table is clear. */
  columns?: Card[][];
  /** A card just drawn and not yet placed. */
  pending?: Card;
  /** Switch cards turned this turn. */
  switches: number;
  /** Cards drawn this turn. */
  drawn: number;
  /** Players still to choose a column this turn, in order. */
  choosers?: string[];
  deckCount: number;
  discardCount: number;
  /** Turns begun so far, for keys. */
  turn: number;
  lastRoll?: Roll;
  lastTake?: Take;
  lastBank?: Bank;
  winner?: string;
  winners?: string[];
  notification?: Notification;
  nextLobbyUID?: string;
  log?: LogEntry[];
};

export type PushPrivateGameState = {
  /** Absent once empty: the database drops empty arrays. */
  deck?: Card[];
  discard?: Card[];
  log?: LogEntry[];
};

export type PushGameState = GenericGameState<PushPlayerState> & {
  public: PushPublicGameState;
  private: PushPrivateGameState;
};
