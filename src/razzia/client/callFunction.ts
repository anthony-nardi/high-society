import { getFunctions, httpsCallable } from "firebase/functions";
import { notifications } from "@mantine/notifications";

/**
 * Calls a Razzia Cloud Function and surfaces a failure to the player
 * instead of swallowing it, since the server rejects illegal moves with a
 * reason worth reading.
 */
export default async function callFunction<Request>(
  name: string,
  request: Request
) {
  const api = httpsCallable<Request, void>(getFunctions(), name);
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
