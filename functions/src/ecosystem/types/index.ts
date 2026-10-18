import {
  GameStatus,
  GenericGameState,
  GenericPlayerState,
  LogEntry,
  Notification,
} from "../../shared/types";

export type CardType =
  | "BEAR"
  | "BEE"
  | "DEER"
  | "DRAGONFLY"
  | "EAGLE"
  | "FOX"
  | "MEADOW"
  | "RABBIT"
  | "STREAM"
  | "TROUT"
  | "WOLF";

/** Cards placed, keyed "row_col" relative to the first card; rows and columns may be negative. */
export type Grid = { [cell: string]: CardType };

export type EcosystemPlayerState = GenericPlayerState & {
  email: string;
  lastActionAt: number;
  /** The hand. Public state, hidden by the table. Absent while empty. */
  hand?: CardType[];
  grid?: Grid;
  isBot: boolean;
};

/** A choice made this pick, kept private until everyone has chosen. */
export type Play = {
  email: string;
  /** Index into the hand. */
  card: number;
  row: number;
  col: number;
  /** A Rabbit's swap: two cells already in the grid. */
  swap?: [string, string];
};

export type Breakdown = {
  email: string;
  /** Points per card type, including stream and wolf placings. */
  byType: { [type in CardType]?: number };
  /** Types that scored at least a point. */
  scoringTypes: number;
  diversity: number;
  total: number;
  /** Length of the longest stream and the number of wolves, for the placings. */
  stream: number;
  wolves: number;
};

/** The third hand in a two-player game. */
export type Neutral = {
  /** Cards still circulating. Absent while empty. */
  hand?: CardType[];
  /** Cards set aside face up, one per pick. Absent while empty. */
  discards?: CardType[];
};

export type EcosystemPublicGameState = {
  id: string;
  game: string;
  players: EcosystemPlayerState[];
  activePlayer: string;
  startAt: string;
  status: GameStatus;
  /** 1 or 2. */
  round: number;
  /** Picks made this round, 0 to 10. */
  pick: number;
  /** Who has chosen this pick. Absent while empty. */
  chosen?: string[];
  neutral?: Neutral;
  /** What the last pick placed, by player. */
  lastPick?: {
    email: string;
    card: CardType;
    cell: string;
    swapped?: [string, string];
  }[];
  turn: number;
  winner?: string;
  draw?: boolean;
  results?: Breakdown[];
  notification?: Notification;
  nextLobbyUID?: string;
  log?: LogEntry[];
};

export type EcosystemPrivateGameState = {
  deck?: CardType[];
  plays?: Play[];
  log?: LogEntry[];
};

export type EcosystemGameState = GenericGameState<EcosystemPlayerState> & {
  public: EcosystemPublicGameState;
  private: EcosystemPrivateGameState;
};
