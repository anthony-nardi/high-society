import { getDatabase, onValue, ref } from "firebase/database";
import { GameState } from "../types";
import { useEffect, useRef, useState } from "react";

const useGameStatus = (lobbyId: number | null, isSignedIn: boolean) => {
  const [isLoading, setIsLoading] = useState(false);
  const [gameStatus, setGameStatus] = useState<null | GameState["status"]>(
    null
  );
  const lobbyIdFetched = useRef<number | null>(null);

  useEffect(() => {
    if (!lobbyId || typeof lobbyId !== "number" || !isSignedIn) return;

    if (lobbyIdFetched.current !== lobbyId) {
      lobbyIdFetched.current = lobbyId;
      setIsLoading(true);
    }
    const db = getDatabase();

    const lobbyRef = ref(db, "games/" + lobbyId + "/public/status");

    onValue(
      lobbyRef,
      (snapshot) => {
        const data = snapshot.val() as GameState["status"];
        setIsLoading(false);
        setGameStatus(data);
      },
      (err) => {
        setIsLoading(false);
        console.log(err);
      }
    );
  }, [isSignedIn, lobbyId, setGameStatus]);

  return {
    isLoading,
    gameStatus,
  };
};

export default useGameStatus;
