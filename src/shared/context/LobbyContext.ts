import { createContext } from "react";
import { LobbyData } from "../lobby/types";

export type LobbyContextValue = {
  lobbyId: null | number;
  isLoadingLobbyData: boolean | null;
  lobbyData: LobbyData | null;
  isJoiningLobby: boolean | null;
};

export const LobbyContext = createContext<LobbyContextValue>({
  lobbyId: null,
  isLoadingLobbyData: null,
  lobbyData: null,
  isJoiningLobby: null,
});
