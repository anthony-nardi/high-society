import { getFunctions, httpsCallable } from "firebase/functions";

export type RemoveBotRequest = {
  lobbyUID: number;
  email: string;
};

export default async function removeBot(request: RemoveBotRequest) {
  const functions = getFunctions();

  const removeBotApi = httpsCallable<RemoveBotRequest, void>(
    functions,
    "removebot"
  );

  await removeBotApi(request);
}
