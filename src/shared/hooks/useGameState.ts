import { DataSnapshot, getDatabase, onValue, ref } from "firebase/database";
import { useEffect, useRef, useState } from "react";
import { useUserContext } from "../context/useUserContext";
import { useLobbyContext } from "../context/useLobbyContext";

const useGameState = <GameStateType>() => {
  const { lobbyId } = useLobbyContext();
  const { isSignedIn } = useUserContext();

  const [isLoading, setIsLoading] = useState(false);
  const [gameState, setGameState] = useState<null | GameStateType>(null);
  const lobbyIdFetched = useRef<number | null>(null);

  useEffect(() => {
    if (!lobbyId || typeof lobbyId !== "number" || !isSignedIn) return;

    if (lobbyIdFetched.current !== lobbyId) {
      lobbyIdFetched.current = lobbyId;
      setIsLoading(true);
    }

    const db = getDatabase();
    const lobbyRef = ref(db, `games/${lobbyId}/public`);

    const handleValueChange = (snapshot: DataSnapshot) => {
      const data = snapshot.val() as GameStateType;
      setIsLoading(false);
      setGameState(data);
    };

    const handleError = (err: Error) => {
      setIsLoading(false);
      console.error(err);
    };

    const unsubscribe = onValue(lobbyRef, handleValueChange, handleError);

    return () => unsubscribe();
  }, [isSignedIn, lobbyId]);

  return {
    isLoading,
    gameState,
  };
};

export default useGameState;
