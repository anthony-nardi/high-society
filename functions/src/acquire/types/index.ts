import {
  GameStatus,
  GenericGameState,
  GenericPlayerState,
  LogEntry,
  Notification,
} from "../../shared/types";

export type Chain =
  | "LUXOR"
  | "TOWER"
  | "AMERICAN"
  | "FESTIVAL"
  | "WORLDWIDE"
  | "CONTINENTAL"
  | "IMPERIAL";

/**
 * Which stockholders a swallowed chain pays: Classic pays the top two,
 * Tycoon the top three. Two-player games are always Classic.
 */
export type Mode = "CLASSIC" | "TYCOON";

/** A board square such as "7E": column 1 to 12, row A to I. */
export type Tile = string;

export type Phase =
  /** The turn player plays a tile, or declares the end if allowed. */
  | "PLACE"
  /** The tile founds a chain: choose which. */
  | "FOUND"
  /** Two or more largest chains tie: the turn player chooses the survivor. */
  | "SURVIVOR"
  /** A shareholder of the chain being absorbed sells, trades or keeps. */
  | "DISPOSE"
  /** The turn player buys up to three shares, then the turn ends. */
  | "BUY";

export type AcquirePlayerState = GenericPlayerState & {
  email: string;
  lastActionAt: number;
  money: number;
  stocks?: { [chain in Chain]?: number };
  /** The hand. The table shows only your own. */
  tiles?: Tile[];
  isBot: boolean;
};

export type ChainState = {
  /** Tiles in the chain; zero means available to found. */
  size: number;
  /** Certificates left in the bank, from 25. */
  stockLeft: number;
};

export type Merger = {
  tile: Tile;
  survivor?: Chain;
  /** Chains still to absorb, largest first. Absent once empty: the database drops empty arrays. */
  defunct?: Chain[];
  /** The chain being settled right now. */
  current?: Chain;
  /** Its price at the moment of the merger, for sales. */
  price?: number;
  /** Shareholders still to decide, in turn order from the merging player. */
  queue?: string[];
  /** Chains tied for largest, while a survivor is chosen. */
  candidates?: Chain[];
  /** The bonuses paid for the chain being settled, as they were paid. Absent when none. */
  paid?: { email: string; amount: number }[];
  /** Who held the chain being settled when it was swallowed. Absent when none. */
  holders?: { email: string; shares: number }[];
  /** Settlements made so far for the chain being settled. Absent when none. */
  settled?: Settlement[];
  /** Every chain of this merger so far, for the recap. Absent until the first. */
  chains?: ChainRecord[];
};

export type Settlement = {
  email: string;
  sell: number;
  trade: number;
  keep: number;
  /** Cash from the sale. */
  cash: number;
};

/** One swallowed chain of a merger, as it was settled. */
export type ChainRecord = {
  chain: Chain;
  size: number;
  price: number;
  paid?: { email: string; amount: number }[];
  holders?: { email: string; shares: number }[];
  settled?: Settlement[];
};

/** The last merger in full, kept until the next tile is played. */
export type MergerRecord = {
  tile: string;
  by: string;
  survivor: Chain;
  /** The survivor's size once the merger completed. */
  size: number;
  chains: ChainRecord[];
};

export type Score = {
  email: string;
  /** Final cash. */
  money: number;
  /** Cash in hand when the end was called, before the payout. */
  cashBefore: number;
  /** Stockholder bonuses paid at the end, per chain. Absent when none. */
  bonuses?: { chain: Chain; amount: number }[];
  /** Shares sold back at the end, per chain. Absent when none. */
  sales?: { chain: Chain; shares: number; price: number; amount: number }[];
};

export type AcquirePublicGameState = {
  id: string;
  game: string;
  players: AcquirePlayerState[];
  /** Who must act now: the turn player, or a shareholder during a merger. */
  activePlayer: string;
  /** Whose turn it is. */
  turnPlayer: string;
  startAt: string;
  status: GameStatus;
  phase: Phase;
  mode: Mode;
  /** Occupied squares: the chain they belong to, or "NONE" for a lone tile. */
  board?: { [tile: Tile]: Chain | "NONE" };
  chains: { [chain in Chain]: ChainState };
  merger?: Merger;
  lastMerger?: MergerRecord;
  /** Shares bought so far this turn. */
  bought: number;
  bagCount: number;
  turn: number;
  lastMove?: {
    type: "tile" | "found" | "merge" | "dispose" | "buy" | "skip" | "declare";
    email: string;
    tile?: Tile;
    chain?: Chain;
    tiles?: Tile[];
  };
  /** Who called the end; the game finishes when their turn does. */
  declaredBy?: string;
  winner?: string;
  /** Final cash per player with how it was reached. A list, since database keys may not hold an email. */
  scores?: Score[];
  notification?: Notification;
  nextLobbyUID?: string;
  log?: LogEntry[];
};

export type AcquirePrivateGameState = {
  /** Absent once empty: the database drops empty arrays. */
  bag?: Tile[];
  log?: LogEntry[];
};

export type AcquireGameState = GenericGameState<AcquirePlayerState> & {
  public: AcquirePublicGameState;
  private: AcquirePrivateGameState;
};
