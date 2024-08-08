import { useEffect, useState } from "react";
import { LobbyData } from "../types";
import { getDatabase, onValue, ref } from "firebase/database";
import { User } from "firebase/auth";

// Type definitions for the hook's state
type UseLobbyDataState = {
  isLoadingLobbyData: boolean | null;
  lobbyData: LobbyData | null;
};

// Function to subscribe to lobby data
const subscribeToLobbyData = (
  lobbyId: number,
  setLobbyData: (data: LobbyData | null) => void,
  setIsLoading: (isLoading: boolean) => void
) => {
  const db = getDatabase();
  const lobbyRef = ref(db, `lobbies/${lobbyId}`);

  const unsubscribe = onValue(lobbyRef, (snapshot) => {
    const data = snapshot.val();
    setLobbyData(data);
    setIsLoading(false);
  });

  return unsubscribe;
};

const useLobbyData = ({
  lobbyId,
  user,
}: {
  lobbyId: number | null;
  user: User | null;
}): UseLobbyDataState => {
  const [isLoadingLobbyData, setIsLoading] = useState<boolean | null>(null);
  const [lobbyData, setLobbyData] = useState<LobbyData | null>(null);

  useEffect(() => {
    if (!user || !lobbyId || typeof lobbyId !== "number") {
      return;
    }
    setIsLoading(true);

    const unsubscribe = subscribeToLobbyData(
      lobbyId,
      setLobbyData,
      setIsLoading
    );

    return () => {
      unsubscribe();
      setIsLoading(false);
    };
  }, [lobbyId, user]);

  return {
    isLoadingLobbyData,
    lobbyData,
  };
};

export default useLobbyData;
