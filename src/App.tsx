import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";
import "firebaseui/dist/firebaseui.css";
import Lobby from "./lobby";
import initializeFirebase from "./utils/initializeFirebase";
import Login from "./login";
import { User } from "firebase/auth";
import { getDatabase, onValue, ref } from "firebase/database";
import Game from "./game";
import { Center, Stack, Title } from "@mantine/core";
import { GameState } from "./game/types";

initializeFirebase();

function App() {
  const [lobbyId, setLobbyId] = useState<number | null>(
    Number(window.location.hash.replace(/\D/g, ""))
  );
  const [isSignedIn, setIsSignedIn] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [gameData, setGameData] = useState<GameState | null>(null);

  const handleURLChange = useCallback(() => {
    const lobbyUID = window.location.hash.replace(/\D/g, "");
    setLobbyId(Number(lobbyUID));
  }, []);

  useEffect(() => {
    window.addEventListener("popstate", handleURLChange);

    return () => {
      window.removeEventListener("popstate", handleURLChange);
    };
  }, [handleURLChange]);

  const handleSignInFailed = useCallback(() => {
    setIsSignedIn(false);
  }, []);

  const handleSignInSuccess = useCallback((user: User) => {
    setIsSignedIn(true);
    setUser(user);

    if (!user.email) {
      throw new Error("User doesn't have an email");
    }
  }, []);

  useEffect(() => {
    if (!lobbyId || typeof lobbyId !== "number") return;

    const db = getDatabase();

    const lobbyRef = ref(db, "games/" + lobbyId + "/public/status");

    onValue(lobbyRef, (snapshot) => {
      const data = snapshot.val();
      setGameData(data);
    });
  }, [lobbyId]);

  const isGameActive = useMemo(() => {
    return isSignedIn && gameData && lobbyId && user;
  }, [isSignedIn, gameData, lobbyId, user]);

  const isGameOver = useMemo(() => {
    return gameData && gameData.status === "GAME_OVER";
  }, [gameData]);

  return (
    <div className="App">
      {!isGameActive && (
        <Stack h={200} justify="space-around" gap="md">
          <Center>
            <Title order={1}>High Society</Title>
          </Center>
        </Stack>
      )}
      {!isSignedIn && (
        <Login
          onSignInFailed={handleSignInFailed}
          onSignInSuccess={handleSignInSuccess}
        />
      )}
      {isSignedIn && !gameData && <Lobby user={user} />}
      {isGameActive && !isGameOver && (
        <Game lobbyId={lobbyId?.toString() as string} user={user as User} />
      )}
      {isGameActive && isGameOver && <h1>Game Over</h1>}
    </div>
  );
}

export default App;
