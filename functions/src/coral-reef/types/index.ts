import {
  GameStatus,
  GenericGameState,
  GenericPlayerState,
  LogEntry,
  Notification,
} from "../../shared/types";

export type CardType =
  | "CORAL"
  | "KRILL"
  | "PLANKTON"
  | "GROUPER"
  | "CLOWNFISH"
  | "CRAB"
  | "EEL"
  | "SHARK"
  | "WHALE"
  | "TURTLE"
  | "OCTOPUS";

export type FoodWebGroup = "PRODUCERS" | "PREY" | "PREDATORS";

/** Cards placed, keyed "row_col" relative to the first card; rows and columns may be negative. */
export type Grid = { [cell: string]: CardType };

export type CoralReefPlayerState = GenericPlayerState & {
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
  /** An Octopus's swap: two cells already in the grid. */
  swap?: [string, string];
  /** An Octopus's move: a card's cell and the empty cell it goes to. */
  move?: [string, string];
};

export type Breakdown = {
  email: string;
  /** Points per card type, the plankton placing included. */
  byType: { [type in CardType]?: number };
  producers: number;
  prey: number;
  predators: number;
  /** The lowest food web group, added again. */
  foodWeb: number;
  /** Turtles and octopuses, outside the food web. */
  other: number;
  total: number;
  /** Faceup plankton, for the placing. */
  plankton: number;
  /** Cells turned facedown by whales. Absent when none. */
  flipped?: string[];
};

/** The third hand in a two-player game. */
export type Neutral = {
  /** Cards still circulating. Absent while empty. */
  hand?: CardType[];
  /** Cards set aside face up, one per pick. Absent while empty. */
  discards?: CardType[];
};

export type CoralReefPublicGameState = {
  id: string;
  game: string;
  players: CoralReefPlayerState[];
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
    moved?: [string, string];
  }[];
  turn: number;
  winner?: string;
  draw?: boolean;
  results?: Breakdown[];
  notification?: Notification;
  nextLobbyUID?: string;
  log?: LogEntry[];
};

export type CoralReefPrivateGameState = {
  deck?: CardType[];
  plays?: Play[];
  log?: LogEntry[];
};

export type CoralReefGameState = GenericGameState<CoralReefPlayerState> & {
  public: CoralReefPublicGameState;
  private: CoralReefPrivateGameState;
};
