export type GameStatus = "IN_PROGRESS" | "GAME_OVER";

export type Notification = {
  title: string;
  message?: string;
  timestamp: number;
};

export type PlayerState = {
  email: string;
  lastActionAt: number;
  moneyCards: string[];
  statusCards?: string[]; // Realtime Database return nothing if array is empty
  currentBid?: string[]; // Realtime Database return nothing if array is empty
  hasPassed: boolean;
};

export type PublicGameState = {
  id: string;
  game: string;
  players: PlayerState[];
  activePlayer: string;
  startAt: string;
  status: GameStatus;
  currentStatusCard: string;
  remainingCards: number;
  notification?: Notification;
};

export type PrivateGameState = {
  deck: string[];
};

export type GameState = {
  public: PublicGameState;
  private: PrivateGameState;
};
