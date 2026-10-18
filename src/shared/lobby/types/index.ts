export type CreateLobbyResponse = {
  lobbyUID: number;
};

export type LobbyPlayer = {
  email: string;
  ready: boolean;
  isBot?: boolean;
};

export type LobbyData = {
  id: string;
  players: LobbyPlayer[];
  /** Variant choices made when the lobby was created. */
  options?: { mode?: string };
};
