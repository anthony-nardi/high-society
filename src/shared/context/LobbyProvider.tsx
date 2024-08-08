import { createContext, useCallback, useState } from "react";
import getLobbyIdFromURL from "../utils/getLobbyIdFromURL";
import usePopstate from "../hooks/usePopstate";
import useLobbyData from "../lobby/hooks/useLobbyData";
import useJoinLobby from "../lobby/hooks/useJoinLobby";
import { LobbyData } from "../lobby/types";
import { useUserContext } from "./useUserContext";

export const LobbyContext = createContext<{
  lobbyId: null | number;
  isLoadingLobbyData: boolean | null;
  lobbyData: LobbyData | null;
  isJoiningLobby: boolean | null;
}>({
  lobbyId: null,
  isLoadingLobbyData: null,
  lobbyData: null,
  isJoiningLobby: null,
});

export const LobbyProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useUserContext();
  const [lobbyId, setLobbyId] = useState<number | null>(getLobbyIdFromURL());

  const handleURLChange = useCallback(() => {
    const lobbyUID = window.location.hash.replace(/\D/g, "");
    setLobbyId(Number(lobbyUID));
  }, []);

  usePopstate(handleURLChange);

  const { isLoading: isJoiningLobby } = useJoinLobby({
    lobbyId,
    user,
  });

  const { isLoadingLobbyData, lobbyData } = useLobbyData({ lobbyId, user });

  return (
    <LobbyContext.Provider
      value={{
        lobbyId,
        isLoadingLobbyData,
        isJoiningLobby,
        lobbyData,
      }}
    >
      {children}
    </LobbyContext.Provider>
  );
};
