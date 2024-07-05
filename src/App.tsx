import React, { useCallback, useEffect } from "react";
import logo from "./logo.svg";
import "./App.css";

import firebase from "firebase/compat/app";
import * as firebaseui from "firebaseui";
import "firebaseui/dist/firebaseui.css";
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  connectAuthEmulator,
} from "firebase/auth";
import { getDatabase, ref, child, get } from "firebase/database";
import {
  getFunctions,
  httpsCallable,
  connectFunctionsEmulator,
  HttpsCallableResult,
} from "firebase/functions";

type CreateLobbyResponse = {
  lobbyUID: number;
};

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA51EwhB9NThvn4QRtw5NEmGFmBTuKKKGM",
  authDomain: "high-society-c4ff4.firebaseapp.com",
  databaseURL: "https://high-society-c4ff4-default-rtdb.firebaseio.com",
  projectId: "high-society-c4ff4",
  storageBucket: "high-society-c4ff4.appspot.com",
  messagingSenderId: "459808509720",
  appId: "1:459808509720:web:69ae9362b926b6dc20986d",
  measurementId: "G-Q8NW81HQQ9",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

function App() {
  const provider = new GoogleAuthProvider();
  const database = getDatabase(app);

  const handleURLChange = useCallback(() => {
    console.log(window.location.href);
    console.log(window.location.hash);
  }, []);

  useEffect(() => {
    window.addEventListener("popstate", handleURLChange);

    return () => {
      window.removeEventListener("popstate", handleURLChange);
    };
  }, [handleURLChange]);

  const handleSignIn = useCallback(() => {
    const auth = getAuth();
    connectAuthEmulator(auth, "http://127.0.0.1:9099");

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

  const handleWriteToDatabase = useCallback(() => {
    const functions = getFunctions();
    connectFunctionsEmulator(functions, "127.0.0.1", 5001);

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

  return (
    <div className="App">
      <header className="App-header">
        <button onClick={handleSignIn}>Sign in</button>
        <button onClick={handleCreateGame}>Create Game</button>
        <button onClick={handleWriteToDatabase}>handleWriteToDatabase</button>
      </header>
    </div>
  );
}

export default App;
