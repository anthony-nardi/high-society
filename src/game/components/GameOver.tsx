import { useEffect, useState } from "react";
import { GameState } from "../types";
import { getDatabase, onValue, ref } from "firebase/database";

export default function GameOver({ lobbyId }: { lobbyId: string }) {
  const [gameData, setGameData] = useState<null | GameState>(null);
  useEffect(() => {
    const db = getDatabase();

    const lobbyRef = ref(db, "games/" + lobbyId + "/public");

    onValue(lobbyRef, (snapshot) => {
      const data = snapshot.val();
      setGameData(data);
    });
  }, [lobbyId]);

  return <>{gameData}</>;
}
