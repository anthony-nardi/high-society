import { getDatabase, onValue, ref } from "firebase/database";
import { useEffect, useRef, useState } from "react";
import { useLobbyContext } from "../context/LobbyProvider";
import { useUserContext } from "../context/useUserContext";

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

    const lobbyRef = ref(db, "games/" + lobbyId + "/public");

    onValue(
      lobbyRef,
      (snapshot) => {
        const data = snapshot.val() as GameStateType;
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
