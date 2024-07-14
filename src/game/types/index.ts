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
  statusCards?: string[];
  currentBid?: string[];
  hasPassed: boolean;
};

export type GameState = {
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
