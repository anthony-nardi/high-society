import {
  GameStatus,
  GenericGameState,
  GenericPlayerState,
  LogEntry,
  Notification,
} from "../../shared/types";

export type CardType =
  | "WATERING_HOLE"
  | "GRASSLAND"
  | "TREE"
  | "GAZELLE"
  | "ZEBRA"
  | "GIRAFFE"
  | "CHEETAH"
  | "LION"
  | "ELEPHANT"
  | "HYENA"
  | "VULTURE";

/** Cards placed, keyed "row_col" relative to the first card; rows and columns may be negative. */
export type Grid = { [cell: string]: CardType };

export type SavannaPlayerState = GenericPlayerState & {
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
};

export type Breakdown = {
  email: string;
  /** Points per card type, the gazelle bonus included. */
  byType: { [type in CardType]?: number };
  total: number;
  /** Gazelles in the ecosystem, for the bonus. */
  gazelles: number;
  /** Cells the cheetahs and lions turned facedown, in scoring order. Absent when none. */
  flipped?: string[];
};

/** The third hand in a two-player game. */
export type Neutral = {
  hand?: CardType[];
  discards?: CardType[];
};

export type SavannaPublicGameState = {
  id: string;
  game: string;
  players: SavannaPlayerState[];
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
  lastPick?: { email: string; card: CardType; cell: string }[];
  turn: number;
  winner?: string;
  draw?: boolean;
  results?: Breakdown[];
  notification?: Notification;
  nextLobbyUID?: string;
  log?: LogEntry[];
};

export type SavannaPrivateGameState = {
  deck?: CardType[];
  plays?: Play[];
  log?: LogEntry[];
};

export type SavannaGameState = GenericGameState<SavannaPlayerState> & {
  public: SavannaPublicGameState;
  private: SavannaPrivateGameState;
};
