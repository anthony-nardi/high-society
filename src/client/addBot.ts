import { getFunctions, httpsCallable } from "firebase/functions";

export type AddBotRequesst = {
  lobbyUID: number;
};

export default async function addBot(addBotRequest: AddBotRequesst) {
  const functions = getFunctions();

  const addBotApi = httpsCallable<AddBotRequesst, void>(functions, "addbot");

  await addBotApi(addBotRequest);
}
