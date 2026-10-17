import {
  GameStatus,
  GenericGameState,
  GenericPlayerState,
  LogEntry,
  Notification,
} from "../../shared/types";

/** All money is in thousands of dollars. */
export type Phase =
  /** Properties are auctioned, one set per round. */
  | "BUYING"
  /** Properties are sold for cheques, everyone choosing at once. */
  | "SELLING";

export type ForSalePlayerState = GenericPlayerState & {
  email: string;
  lastActionAt: number;
  money: number;
  /** Properties bought, 1 to 30. Public: they were bought in the open. */
  properties?: number[];
  /** Cheques received, in thousands. The table shows only your own. */
  cheques?: number[];
  /** Standing bid in the current auction. */
  bid: number;
  /** Out of the current auction. */
  passed?: boolean;
  isBot: boolean;
};

export type Sale = { email: string; property: number; cheque: number };

export type ForSalePublicGameState = {
  id: string;
  game: string;
  players: ForSalePlayerState[];
  /** Whose turn it is to bid, or who the table waits on to choose. */
  activePlayer: string;
  startAt: string;
  status: GameStatus;
  phase: Phase;
  round: number;
  /** Properties up for auction, lowest first. */
  onOffer?: number[];
  /** Cheques up for grabs, lowest first. */
  cheques?: number[];
  highBid: number;
  highBidder?: string;
  /** Who opened the current auction. */
  starting: string;
  /** Who has already chosen a property to sell this round. */
  chosen?: string[];
  /** The last selling round, for the table to show. */
  lastSale?: Sale[];
  propertiesLeft: number;
  chequesLeft: number;
  lastMove?: {
    type: "bid" | "pass" | "buy" | "sale";
    email?: string;
    amount?: number;
    property?: number;
  };
  winner?: string;
  notification?: Notification;
  nextLobbyUID?: string;
  log?: LogEntry[];
};

export type ForSalePrivateGameState = {
  /** Absent once empty: the database drops empty arrays. */
  propertyDeck?: number[];
  chequeDeck?: number[];
  /** Face-down choices in the current selling round. A list, since database keys may not hold an email. */
  choices?: { email: string; property: number }[];
  log?: LogEntry[];
};

export type ForSaleGameState = GenericGameState<ForSalePlayerState> & {
  public: ForSalePublicGameState;
  private: ForSalePrivateGameState;
};
