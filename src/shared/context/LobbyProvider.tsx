import { useCallback, useState } from "react";
import getLobbyIdFromURL from "../utils/getLobbyIdFromURL";
import usePopstate from "../hooks/usePopstate";
import useLobbyData from "../lobby/hooks/useLobbyData";
import useJoinLobby from "../lobby/hooks/useJoinLobby";
import { useUserContext } from "./useUserContext";
import { LobbyContext } from "./LobbyContext";
import { registerPersonas } from "../utils/displayName";

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
  registerPersonas(lobbyData?.players);

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
