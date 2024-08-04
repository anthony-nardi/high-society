import {
  GameStatus,
  GenericGameState,
  GenericPlayerState,
  Notification,
} from "../../shared/types";

export type HighSocietyPlayerState = GenericPlayerState & {
  email: string;
  lastActionAt: number;
  moneyCards: string[];
  statusCards?: string[]; // Realtime Database return nothing if array is empty
  currentBid?: string[]; // Realtime Database return nothing if array is empty
  hasPassed: boolean;
  isBot: boolean;
};

export type PublicGameState = {
  id: string;
  game: string;
  players: HighSocietyPlayerState[];
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

export type HighSocietyGameState = GenericGameState<HighSocietyPlayerState> & {
  public: PublicGameState;
  private: PrivateGameState;
};
