import { useCallback, useEffect, useState } from "react";
import "./App.css";
import "firebaseui/dist/firebaseui.css";
import Lobby from "./lobby";
import initializeFirebase from "./utils/initializeFirebase";
import Login from "./login";
import { User } from "firebase/auth";
import { getDatabase, onValue, ref } from "firebase/database";
import Game from "./game";

initializeFirebase();

function App() {
  const [lobbyId, setLobbyId] = useState<number | null>(
    Number(window.location.hash.replace(/\D/g, ""))
  );
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [user, setUser] = useState<null | User>(null);
  const [gameData, setGameData] = useState<any>(null);

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

  console.log(gameData);

  return (
    <div className="App">
      <header className="App-header">
        {!isSignedIn && (
          <Login
            onSignInFailed={handleSignInFailed}
            onSignInSuccess={handleSignInSuccess}
          />
        )}
        {isSignedIn && !gameData && <Lobby user={user} />}
        {isSignedIn && gameData && lobbyId && (
          <Game lobbyId={lobbyId.toString()} user={user} />
        )}
      </header>
    </div>
  );
}

export default App;
