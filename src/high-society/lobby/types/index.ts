export type CreateLobbyResponse = {
  lobbyUID: number;
};

export type LobbyData = {
  id: string;
  players: {
    email: string;
    ready: boolean;
  }[];
};
