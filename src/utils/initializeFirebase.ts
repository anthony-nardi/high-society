import { initializeApp } from "firebase/app";
import { firebaseConfig } from "../constants/firebaseConfig";
import { connectDatabaseEmulator, getDatabase } from "firebase/database";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";

export default function initializeFirebase() {
  initializeApp(firebaseConfig);

  if (window.location.hostname === "localhost") {
    const db = getDatabase();
    const auth = getAuth();
    const functions = getFunctions();

    connectAuthEmulator(auth, "http://127.0.0.1:9099");
    connectDatabaseEmulator(db, "127.0.0.1", 9000);
    connectFunctionsEmulator(functions, "127.0.0.1", 5001);
  }
}
