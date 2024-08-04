export type GameName = "high-society" | "no-thanks";

export type GameStatus = "IN_PROGRESS" | "GAME_OVER";

export type Notification = {
  title: string;
  message?: string;
  timestamp: number;
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

export type GenericGameState = {
  public: {
    id: string;
    game: GameName;
    players: GenericPlayerState[];
    activePlayer: string;
    startAt: string;
    status: GameStatus;
    notification?: Notification;
  };
  private: { [key: string]: any };
};
