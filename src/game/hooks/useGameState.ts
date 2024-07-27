import { getDatabase, onValue, ref } from "firebase/database";
import { GameState } from "../types";
import { useEffect, useRef, useState } from "react";

const useGameState = (lobbyId: number | null, isSignedIn: boolean) => {
  const [isLoading, setIsLoading] = useState(false);
  const [gameState, setGameState] = useState<null | GameState>(null);
  const lobbyIdFetched = useRef<number | null>(null);

  useEffect(() => {
    if (!lobbyId || typeof lobbyId !== "number" || !isSignedIn) return;

    if (lobbyIdFetched.current !== lobbyId) {
      lobbyIdFetched.current = lobbyId;
      setIsLoading(true);
    }
    const db = getDatabase();

    const lobbyRef = ref(db, "games/" + lobbyId + "/public");

    onValue(
      lobbyRef,
      (snapshot) => {
        const data = snapshot.val() as GameState;
        setIsLoading(false);
        setGameState(data);
      },
      (err) => {
        setIsLoading(false);
        console.log(err);
      }
    );
  }, [isSignedIn, lobbyId]);

  return {
    isLoading,
    gameState,
  };
};

export default useGameState;
