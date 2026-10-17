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
  /** Occupied squares: the chain they belong to, or "NONE" for a lone tile. */
  board?: { [tile: Tile]: Chain | "NONE" };
  chains: { [chain in Chain]: ChainState };
  merger?: Merger;
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
  declaredBy?: string;
  winner?: string;
  scores?: { [email: string]: number };
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
