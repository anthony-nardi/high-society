import admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { getDatabase } from "firebase-admin/database";

admin.initializeApp();

exports.createlobby = onCall((request) => {
  // Checking that the user is authenticated.
  if (!request.auth) {
    // Throwing an HttpsError so that the client gets the error details.
    throw new HttpsError(
      "failed-precondition",
      "The function must be " + "called while authenticated."
    );
  }

  const lobbyUID = Date.now().toString();

  return getDatabase()
    .ref("/lobbies/" + lobbyUID)
    .set({
      id: lobbyUID,
      game: "high-society",
      players: [
        {
          email: request.auth.token.email || request.auth.token.uid,
          ready: false,
        },
      ],
    })
    .then(() => {
      logger.info("New lobby created.");
      return { lobbyUID };
    })
    .catch((error: Error) => {
      // Re-throwing the error as an HttpsError so that the client gets
      // the error details.
      throw new HttpsError("unknown", error.message, error);
    });
});
