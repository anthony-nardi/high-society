import { getDatabase, onValue, ref } from "firebase/database";
import { GameState } from "../types";
import { useEffect, useRef, useState } from "react";

const useGameStatus = (lobbyId: number | null) => {
  const [isLoading, setIsLoading] = useState(true);
  const [gameStatus, setGameStatus] = useState<null | GameState["status"]>(
    null
  );
  const lobbyIdFetched = useRef<number | null>(null);

  useEffect(() => {
    if (!lobbyId || typeof lobbyId !== "number") return;

    if (lobbyIdFetched.current !== lobbyId) {
      lobbyIdFetched.current = lobbyId;
      setIsLoading(true);
    }
    const db = getDatabase();

    const lobbyRef = ref(db, "games/" + lobbyId + "/public/status");

    onValue(lobbyRef, (snapshot) => {
      const data = snapshot.val() as GameState["status"];
      setGameStatus(data);
      setIsLoading(false);
    });
  }, [lobbyId, setGameStatus]);

  return {
    isLoading,
    gameStatus,
  };
};

export default useGameStatus;
