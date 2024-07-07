import { User } from "firebase/auth";
import { getDatabase, onValue, ref } from "firebase/database";
import { useEffect, useState } from "react";

export default function Game({
  lobbyId,
  user,
}: {
  lobbyId: string;
  user: User;
}) {
  const [gameData, setGameData] = useState(null);
  console.log(gameData);
  useEffect(() => {
    const db = getDatabase();

    const lobbyRef = ref(db, "games/" + lobbyId + "/public");

    onValue(lobbyRef, (snapshot) => {
      const data = snapshot.val();
      setGameData(data);
    });
  }, [lobbyId]);

  return <div>Game in progress</div>;
}
