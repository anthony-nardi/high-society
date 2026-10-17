import { getFunctions, httpsCallable } from "firebase/functions";
import { notifications } from "@mantine/notifications";

/** Matches the server's move timeout: a move can be followed by many bot moves. */
const MOVE_TIMEOUT_MS = 300_000;

/**
 * Calls a game's move function and surfaces a failure to the player
 * instead of swallowing it: the server rejects illegal moves with a
 * reason worth reading.
 */
export default async function callGameAction<Request extends object>(
  name: string,
  request: Request,
) {
  const api = httpsCallable<Request, void>(getFunctions(), name, {
    timeout: MOVE_TIMEOUT_MS,
  });
  try {
    await api(request);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(e);
    notifications.show({
      title: "That move was not accepted",
      message,
      color: "red",
      autoClose: 6000,
    });
  }
}
