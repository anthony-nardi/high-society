import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { getDatabase } from "firebase-admin/database";

exports.joinlobby = onCall(async (request) => {
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

  console.log(playersSnapshotValue);

  const doesPlayerExist = playersSnapshotValue.find(
    (player: any) => player.email === email
  );

  console.log("doesPlayerExist:", doesPlayerExist ? "true" : "false");

  if (doesPlayerExist) return;

  console.log(`Attempting to add ${email} to the lobby.`);

  playersSnapshotValue.push({
    email,
    ready: false,
    joinedAt: Date.now().toString(),
  });

  console.log(`New players: ${playersSnapshotValue}`);

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
