export type GameName = "high-society" | "no-thanks";

export type PlayerInLobby = {
  email: string;
  ready: boolean;
  joinedAt: string;
  isBot: boolean;
  gameName: GameName;
};
