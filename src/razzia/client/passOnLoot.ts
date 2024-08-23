import { getFunctions, httpsCallable } from "firebase/functions";

export type PassOnLootRequest = {
  lobbyUID: number;
};

export default async function passOnLoot(passOnLootRequest: PassOnLootRequest) {
  const functions = getFunctions();
  const passOnLootApi = httpsCallable<PassOnLootRequest, void>(
    functions,
    "passOnLoot"
  );

  try {
    await passOnLootApi(passOnLootRequest);
  } catch (e) {
    console.error(e);
  }
}
