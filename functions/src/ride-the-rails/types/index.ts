import {
  GameStatus,
  GenericGameState,
  GenericPlayerState,
  LogEntry,
  Notification,
} from "../../shared/types";

export type Railroad =
  "RED" | "BLUE" | "ORANGE" | "YELLOW" | "PURPLE" | "BLACK";

export type Phase =
  /** In reverse turn order, each player takes one share. */
  | "SHARE"
  /** In turn order, each player lays locomotives. */
  | "BUILD"
  /** In turn order, each player carries one passenger. */
  | "RIDE";

/** One leg of a journey: a single railroad's link to the next city. */
export type Leg = { railroad: Railroad; to: number };

export type Journey = { start: number; legs: Leg[] };

export type RideTheRailsPlayerState = GenericPlayerState & {
  email: string;
  lastActionAt: number;
  money: number;
  /** Shares held, by railroad. Absent while empty. */
  shares?: { [railroad in Railroad]?: number };
  isBot: boolean;
};

export type RideResult = {
  email: string;
  journey: Journey;
  /** Every hex the passenger passed through, start first. */
  hexes: number[];
  earned: number;
  dividends: { email: string; amount: number }[];
};

export type RideTheRailsPublicGameState = {
  id: string;
  game: string;
  players: RideTheRailsPlayerState[];
  activePlayer: string;
  startAt: string;
  status: GameStatus;
  phase: Phase;
  /** 1 to 6. */
  round: number;
  /** Turn order this round, poorest first. */
  order: string[];
  /** Index into the order of the player to act (shares go in reverse). */
  seat: number;
  /** Locomotives on the map, by railroad: hex indices. Absent while empty. */
  track?: { [railroad in Railroad]?: number[] };
  /** Locomotives left in the box, by railroad. */
  supply: { [railroad in Railroad]: number };
  /** Cities still holding a passenger. Absent once empty. */
  passengers?: number[];
  /** Locomotives the active player has laid this build turn. */
  built: number;
  /** Whether a mountain was built on this build turn. */
  mountainBuilt: boolean;
  /** $5 cities already paid out. */
  bonusesClaimed?: number[];
  /** Who earned the Transcontinental bonus, once. */
  transcontinental?: string;
  lastMove?: {
    type: "share" | "build" | "end" | "ride" | "skip";
    email: string;
    railroad?: Railroad;
    hex?: number;
  };
  lastRide?: RideResult;
  turn: number;
  winner?: string;
  draw?: boolean;
  notification?: Notification;
  nextLobbyUID?: string;
  log?: LogEntry[];
};

export type RideTheRailsPrivateGameState = {
  log?: LogEntry[];
};

export type RideTheRailsGameState =
  GenericGameState<RideTheRailsPlayerState> & {
    public: RideTheRailsPublicGameState;
    private: RideTheRailsPrivateGameState;
  };
