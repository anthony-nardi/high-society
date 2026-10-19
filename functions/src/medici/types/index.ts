import {
  GameStatus,
  GenericGameState,
  GenericPlayerState,
  LogEntry,
  Notification,
} from "../../shared/types";

export type Commodity = "CLOTH" | "SPICE" | "GRAIN" | "DYE" | "FUR";

/** A commodity card as "CLOTH_5"; the one gold card is "GOLD_10". */
export type Card = string;

/** The auctioneer makes up a lot, then everyone bids once in turn. */
export type Phase = "DRAW" | "BID";

export type MediciPlayerState = GenericPlayerState & {
  email: string;
  lastActionAt: number;
  isBot: boolean;
  /** Florins: the money to bid with and the score. */
  money: number;
  /** Cards loaded this day. Absent while the hold is empty. */
  ship?: Card[];
  /** Position on each commodity track, 0 (the gold frame) to 7 (the top). */
  tracks: { [commodity in Commodity]: number };
  /** This auction: the bid made, or that the player passed or had to. */
  bid?: number;
  passed?: boolean;
};

export type LastAuction = {
  turn: number;
  auctioneer: string;
  lot: Card[];
  /** The buyer and the price; absent when nobody bid and the lot was discarded. */
  email?: string;
  amount?: number;
};

export type ShipResult = {
  email: string;
  value: number;
  pay: number;
  cards?: Card[];
};

export type TrackResult = {
  email: string;
  level: number;
  /** For the highest and second highest position. */
  award: number;
  /** For reaching the top three levels. */
  bonus: number;
};

/** What a day's end paid out, kept until the next day ends. */
export type DayScoring = {
  day: number;
  /** The auction count when the day ended, to tell fresh from stale. */
  turn: number;
  /** The last player afloat took these from the deck for nothing. */
  freeFill?: { email: string; cards: Card[] };
  ships: ShipResult[];
  tracks: { commodity: Commodity; rows: TrackResult[] }[];
  totals: { email: string; before: number; after: number }[];
};

export type MediciPublicGameState = {
  id: string;
  game: string;
  players: MediciPlayerState[];
  activePlayer: string;
  startAt: string;
  status: GameStatus;
  /** 1 to 3. */
  day: number;
  phase: Phase;
  /** Holder of the first player card: makes up the lot and bids last. */
  auctioneer: string;
  /** The face-up cards on offer. Absent between auctions. */
  lot?: Card[];
  highBid?: number;
  highBidder?: string;
  deckCount: number;
  /** Cards a hold takes: five, or seven with two players. */
  capacity: number;
  /** Auctions resolved so far, for keys. */
  turn: number;
  lastAuction?: LastAuction;
  dayScoring?: DayScoring;
  winner?: string;
  winners?: string[];
  notification?: Notification;
  nextLobbyUID?: string;
  log?: LogEntry[];
};

export type MediciPrivateGameState = {
  /** Absent once empty: the database drops empty arrays. */
  deck?: Card[];
  discard?: Card[];
  /** Set aside unseen at the start of the day. */
  removed?: Card[];
  log?: LogEntry[];
};

export type MediciGameState = GenericGameState<MediciPlayerState> & {
  public: MediciPublicGameState;
  private: MediciPrivateGameState;
};
