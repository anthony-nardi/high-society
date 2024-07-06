import { useCallback, useEffect, useState } from "react";
import "./App.css";
import "firebaseui/dist/firebaseui.css";
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  connectAuthEmulator,
} from "firebase/auth";
import {
  getDatabase,
  ref,
  child,
  get,
  connectDatabaseEmulator,
} from "firebase/database";
import Lobby from "./lobby";
import { firebaseConfig } from "./constants/firebaseConfig";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";

type CreateLobbyResponse = {
  lobbyUID: number;
};

// Initialize Firebase
initializeApp(firebaseConfig);

const db = getDatabase();
const auth = getAuth();
connectAuthEmulator(auth, "http://127.0.0.1:9099");

connectDatabaseEmulator(db, "127.0.0.1", 9000);
const functions = getFunctions();
connectFunctionsEmulator(functions, "127.0.0.1", 5001);

function App() {
  const [isSignedIn, setIsSignedIn] = useState(false);

  const provider = new GoogleAuthProvider();

  useEffect(() => {
    const auth = getAuth();
    auth.onAuthStateChanged((user) => {
      if (user) {
        console.log("already signed in", user);
        setIsSignedIn(true);
      } else {
        console.log("not signed in yet");
        setIsSignedIn(false);
      }
    });
  }, [setIsSignedIn]);

  const handleSignIn = useCallback(() => {
    const auth = getAuth();

    signInWithPopup(auth, provider)
      .then((result) => {
        // This gives you a Google Access Token. You can use it to access the Google API.
        const credential = GoogleAuthProvider.credentialFromResult(result);

        if (!credential) {
          throw new Error("Credential not found.");
        }

        const token = credential.accessToken;
        // The signed-in user info.
        const user = result.user;
        // IdP data available using getAdditionalUserInfo(result)
        // ...
      })
      .catch((error) => {
        // Handle Errors here.
        const errorCode = error.code;
        const errorMessage = error.message;
        // The email of the user's account used.
        const email = error.customData.email;
        // The AuthCredential type that was used.
        const credential = GoogleAuthProvider.credentialFromError(error);
        console.log(error);
      });
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
        {!isSignedIn && <button onClick={handleSignIn}>Sign in</button>}
        <button onClick={handleCreateGame}>Create Game</button>
        <Lobby />
      </header>
    </div>
  );
}

export default App;
