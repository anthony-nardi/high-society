import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";
import "firebaseui/dist/firebaseui.css";
import Lobby from "./lobby";
import initializeFirebase from "./utils/initializeFirebase";
import Login from "./login";
import { User } from "firebase/auth";
import { getDatabase, onValue, ref } from "firebase/database";
import Game from "./game";
import { GameState } from "./game/types";
import GameOver from "./game/components/GameOver";
import GameTitle from "./game/components/GameTitle";

initializeFirebase();

function App() {
  const [lobbyId, setLobbyId] = useState<number | null>(
    Number(window.location.hash.replace(/\D/g, ""))
  );
  const [isSignedIn, setIsSignedIn] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [gameDataStatus, setGameDataStatus] = useState<
    GameState["status"] | null
  >(null);

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
      const data = snapshot.val() as GameState["status"];
      setGameDataStatus(data);
    });
  }, [lobbyId]);

  const isGameActive = useMemo(() => {
    return isSignedIn && gameDataStatus && lobbyId && user;
  }, [gameDataStatus, isSignedIn, lobbyId, user]);

  const isGameOver = useMemo(() => {
    return isGameActive && gameDataStatus === "GAME_OVER";
  }, [gameDataStatus, isGameActive]);

  const isGameInProgress = useMemo(() => {
    return isGameActive && gameDataStatus === "IN_PROGRESS";
  }, [gameDataStatus, isGameActive]);

  const isInLobby = useMemo(() => {
    return isSignedIn && !gameDataStatus;
  }, [gameDataStatus, isSignedIn]);

  return (
    <div className="App">
      {!isGameActive && <GameTitle />}
      {!isSignedIn && (
        <Login
          onSignInFailed={handleSignInFailed}
          onSignInSuccess={handleSignInSuccess}
        />
      )}
      {isInLobby && <Lobby user={user} />}
      {isGameInProgress && (
        <Game lobbyId={lobbyId?.toString() as string} user={user as User} />
      )}
      {isGameOver && <GameOver lobbyId={lobbyId?.toString() as string} />}
    </div>
  );
}

export default App;
