import { useEffect, useState } from "react";
import { LobbyData } from "../types";
import { getDatabase, onValue, ref } from "firebase/database";

const useLobbyData = (lobbyId: number | null) => {
  const [isLoadingLobbyData, setIsLoading] = useState<null | boolean>(null);
  const [lobbyData, setLobbyData] = useState<null | LobbyData>(null);

  useEffect(() => {
    if (!lobbyId || typeof lobbyId !== "number") return;

    setIsLoading(true);

    const db = getDatabase();
    const lobbyRef = ref(db, "lobbies/" + lobbyId);

    onValue(lobbyRef, (snapshot) => {
      const data = snapshot.val();
      setLobbyData(data);
      setIsLoading(false);
    });
  }, [lobbyId]);

  useEffect(() => {
    return () => {
      setIsLoading(false);
    };
  });

  return {
    isLoadingLobbyData,
    lobbyData,
  };
};

export default useLobbyData;
