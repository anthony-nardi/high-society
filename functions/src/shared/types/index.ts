export type GameName =
  | "high-society"
  | "no-thanks"
  | "razzia"
  | "family-inc"
  | "zertz"
  | "yinsh"
  | "dvonn"
  | "gipf"
  | "lyngk"
  | "for-sale"
  | "shangri-la"
  | "acquire"
  | "condottiere"
  | "ride-the-rails"
  | "clans"
  | "twixt"
  | "ecosystem"
  | "fuji-flush"
  | "tigris";

export type GameStatus = "IN_PROGRESS" | "GAME_OVER";

export type LogEntry = {
  timestamp: number;
  title: string;
  message?: string;
};

export type Notification = {
  title: string;
  message?: string;
  timestamp: number;
};

/** Choices made when a lobby is created, handed to the game's createState. */
export type LobbyOptions = {
  /** A game-specific variant, such as Acquire's "CLASSIC" or "TYCOON". */
  mode?: string;
};

export type PlayerInLobby = {
  email: string;
  ready: boolean;
  joinedAt: string;
  isBot: boolean;
  gameName: GameName;
};

export type GenericPlayerState = {
  email: string;
  lastActionAt: number;
  isBot: boolean;
};

// Define the GenericGameState type
export type GenericGameState<
  PlayerType extends GenericPlayerState = GenericPlayerState,
> = {
  public: {
    id: string;
    game: GameName;
    players: PlayerType[];
    activePlayer: string;
    startAt: string;
    status: GameStatus;
    notification?: Notification;
  };
  private: { [key: string]: any };
};
