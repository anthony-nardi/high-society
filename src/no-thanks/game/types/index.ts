export type GameStatus = "IN_PROGRESS" | "GAME_OVER";

export type Notification = {
  title: string;
  message?: string;
  timestamp: number;
};

export type NoThanksPlayerState = {
  email: string;
  lastActionAt: number;
  cards?: number[];
  chips: number;
  isBot: boolean;
};

export type NoThanksGameState = {
  id: string;
  game: string;
  players: NoThanksPlayerState[];
  activePlayer: string;
  startAt: string;
  status: GameStatus;
  activeCard: number;
  chipsPlaced: number;
  remainingCards: number;
  notification?: Notification;
};
