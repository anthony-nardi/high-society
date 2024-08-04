import { GenericGameState } from "../../shared/types";

export type GameStatus = "IN_PROGRESS" | "GAME_OVER";

export type Notification = {
  title: string;
  message?: string;
  timestamp: number;
};

export type PlayerState = {
  email: string;
  lastActionAt: number;
  cards?: number[];
  chips: number;
  isBot: boolean;
};

export type PublicGameState = {
  id: string;
  game: string;
  players: PlayerState[];
  activePlayer: string;
  startAt: string;
  status: GameStatus;
  activeCard: number;
  chipsPlaced: number;
  remainingCards: number;
  notification?: Notification;
};

export type PrivateGameState = {
  deck: number[];
};

export type NoThanksGameState = GenericGameState & {
  public: PublicGameState;
  private: PrivateGameState;
};
