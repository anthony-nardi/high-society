import { useCallback, useEffect, useState } from "react";
import { getDatabase, ref, onValue } from "firebase/database";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getAuth, User } from "firebase/auth";
import { CreateLobbyResponse, LobbyData } from "./types";
import PlayersList from "./components/PlayersList";

export default function Lobby({ user }: { user: User | null }) {
  const [lobbyId, setLobbyId] = useState<number | null>(
    Number(window.location.hash.replace(/\D/g, ""))
  );
  const [lobbyData, setLobbyData] = useState<null | LobbyData>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(user);

  useEffect(() => {
    if (!lobbyId) return;

    const auth = getAuth();
    auth.onAuthStateChanged((user) => {
      if (user && typeof user.email === "string") {
        console.log("already signed in", user.email);
        setCurrentUser(user);
        const functions = getFunctions();
        console.log("joining lobby");
        const joinLobby = httpsCallable<any, any>(functions, "joinlobby");
        joinLobby({
          email: user.email,
          lobbyUID: lobbyId,
        })
          .then((result) => {
            const data = result.data;
            console.log(data);
          })
          .catch((err) => console.log(err));
      }
    });
  }, [lobbyId, setCurrentUser]);

  console.log(lobbyData);

  const handleURLChange = useCallback(() => {
    const lobbyUID = window.location.hash.replace(/\D/g, "");
    setLobbyId(Number(lobbyUID));
  }, []);

  useEffect(() => {
    if (!lobbyId || typeof lobbyId !== "number") return;

    console.log("Attempting to fetch lobby ", lobbyId);

    const db = getDatabase();

    const lobbyRef = ref(db, "lobbies/" + lobbyId);
    console.log(lobbyRef);

    onValue(lobbyRef, (snapshot) => {
      const data = snapshot.val();
      console.log("Data for lobby", data);
      setLobbyData(data);
    });
  }, [lobbyId]);

  useEffect(() => {
    window.addEventListener("popstate", handleURLChange);

    return () => {
      window.removeEventListener("popstate", handleURLChange);
    };
  }, [handleURLChange]);

  const handleCreateLobby = useCallback(() => {
    const functions = getFunctions();

    const createLobby = httpsCallable<undefined, CreateLobbyResponse>(
      functions,
      "createlobby"
    );
    createLobby().then((result) => {
      const data = result.data;
      console.log(data);

      if (data.lobbyUID) {
        window.location.hash = `#${data.lobbyUID}`;
      }
    });
  }, []);

  if (!lobbyId) {
    return <button onClick={handleCreateLobby}>Create lobby</button>;
  }

  if (!lobbyData || !lobbyData.players.length || !user) {
    return <div>No data found for lobby</div>;
  }

  return (
    <PlayersList
      user={user}
      players={lobbyData.players}
      lobbyUID={lobbyData.id}
    />
  );
}
