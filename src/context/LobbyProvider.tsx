import { createContext, useCallback, useContext, useState } from "react";
import getLobbyIdFromURL from "../utils/getLobbyIdFromURL";
import usePopstate from "../hooks/usePopstate";
import useLobbyData from "../lobby/hooks/useLobbyData";
import useJoinLobby from "../lobby/hooks/useJoinLobby";
import { LobbyData } from "../lobby/types";
import { useUserContext } from "./useUserContext";

const LobbyContext = createContext<{
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

// eslint-disable-next-line react-refresh/only-export-components
export const useLobbyContext = () => {
  const context = useContext(LobbyContext);

  if (!context) {
    throw new Error("useLobbyContext must be used within a LobbyContext");
  }

  return context;
};

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

  const { isLoadingLobbyData, lobbyData } = useLobbyData(lobbyId);

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
