import {
  GameStatus,
  GenericGameState,
  GenericPlayerState,
  Notification,
} from "../../shared/types";

export type NoThanksPlayerState = GenericPlayerState & {
  email: string;
  lastActionAt: number;
  cards?: number[];
  chips: number;
  isBot: boolean;
};

export type PublicGameState = {
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

export type PrivateGameState = {
  deck: number[];
};

export type NoThanksGameState = GenericGameState<NoThanksPlayerState> & {
  public: PublicGameState;
  private: PrivateGameState;
};
