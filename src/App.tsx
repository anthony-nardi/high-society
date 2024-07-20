import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";
import "firebaseui/dist/firebaseui.css";
import Lobby from "./lobby";
import initializeFirebase from "./utils/initializeFirebase";
import Login from "./login";
import { getAuth, User } from "firebase/auth";
import Game from "./game";
import GameOver from "./game/components/GameOver";
import GameTitle from "./game/components/GameTitle";
import useGameStatus from "./game/hooks/useGameStatus";
import usePopstate from "./hooks/usePopstate";
initializeFirebase();

function App() {
  const [lobbyId, setLobbyId] = useState<number | null>(
    Number(window.location.hash.replace(/\D/g, ""))
  );
  const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const { isLoading: isGameStatusLoading, gameStatus } = useGameStatus(
    lobbyId,
    !!isSignedIn
  );

  const handleURLChange = useCallback(() => {
    const lobbyUID = window.location.hash.replace(/\D/g, "");
    setLobbyId(Number(lobbyUID));
  }, []);

  usePopstate(handleURLChange);

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
    const auth = getAuth();
    auth.onAuthStateChanged((user) => {
      if (user) {
        handleSignInSuccess(user);
      } else {
        handleSignInFailed();
      }
    });
  }, [handleSignInSuccess, handleSignInFailed]);

  const isGameActive = useMemo(() => {
    return isSignedIn && gameStatus && lobbyId && user;
  }, [gameStatus, isSignedIn, lobbyId, user]);

  const isGameOver = useMemo(() => {
    return isGameActive && gameStatus === "GAME_OVER";
  }, [gameStatus, isGameActive]);

  const isGameInProgress = useMemo(() => {
    return isGameActive && gameStatus === "IN_PROGRESS";
  }, [gameStatus, isGameActive]);

  const isInLobby = useMemo(() => {
    return isSignedIn && !gameStatus;
  }, [gameStatus, isSignedIn]);

  return (
    <div className="App">
      {!isGameActive && <GameTitle />}
      {!isSignedIn && (
        <Login
          onSignInFailed={handleSignInFailed}
          onSignInSuccess={handleSignInSuccess}
          isLoading={isSignedIn === null}
        />
      )}
      {isInLobby && <Lobby user={user} />}
      {isGameInProgress && (
        <Game lobbyId={lobbyId?.toString() as string} user={user as User} />
      )}
      {!isInLobby && isGameStatusLoading && <div>isGameStatusLoading...</div>}
      {isGameOver && <GameOver lobbyId={lobbyId?.toString() as string} />}
    </div>
  );
}

export default App;
