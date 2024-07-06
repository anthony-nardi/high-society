import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { getDatabase } from "firebase-admin/database";
import { createGame } from "../creategame";

exports.readyup = onCall(async (request) => {
  // Checking that the user is authenticated.
  if (!request.auth) {
    // Throwing an HttpsError so that the client gets the error details.
    throw new HttpsError(
      "failed-precondition",
      "The function must be " + "called while authenticated."
    );
  }

  const { lobbyUID, email } = request.data;

  // Add new player to the lobby if they don't already exist

  const players = await getDatabase().ref(`lobbies/${lobbyUID}/players`).get();

  const playersSnapshotValue = players.val();

  let areAllPlayersReady = true;

  playersSnapshotValue.forEach((player: any) => {
    if (player.email === email) {
      player.ready = true;
    }

    if (player.ready === false) {
      areAllPlayersReady = false;
    }
  });

  if (playersSnapshotValue.length >= 3 && areAllPlayersReady) {
    try {
      await createGame(lobbyUID);
    } catch (e) {
      console.log(e);
    }
  }

  getDatabase()
    .ref(`lobbies/${lobbyUID}/players`)
    .set(playersSnapshotValue)
    .then(() => {
      logger.info("Lobby joined.");
      return { lobbyUID };
    })
    .catch((error: Error) => {
      // Re-throwing the error as an HttpsError so that the client gets
      // the error details.
      throw new HttpsError("unknown", error.message, error);
    });
});
