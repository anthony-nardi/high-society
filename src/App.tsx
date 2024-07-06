import { useCallback, useState } from "react";
import "./App.css";
import "firebaseui/dist/firebaseui.css";
import { getDatabase, ref, child, get } from "firebase/database";
import Lobby from "./lobby";
import initializeFirebase from "./utils/initializeFirebase";
import Login from "./login";
import { User } from "firebase/auth";

initializeFirebase();

function App() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [user, setUser] = useState<null | User>(null);

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

  const handleCreateGame = useCallback(() => {
    const dbRef = ref(getDatabase());
    get(child(dbRef, `games/gameSettings`))
      .then((snapshot) => {
        if (snapshot.exists()) {
          console.log(snapshot.val());
        } else {
          console.log("No data available");
        }
      })
      .catch((error) => {
        console.error(error);
      });
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        {!isSignedIn && (
          <Login
            onSignInFailed={handleSignInFailed}
            onSignInSuccess={handleSignInSuccess}
          />
        )}
        {isSignedIn && <button onClick={handleCreateGame}>Create Game</button>}
        {isSignedIn && <Lobby user={user} />}
      </header>
    </div>
  );
}

export default App;
