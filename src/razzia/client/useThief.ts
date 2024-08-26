import { getFunctions, httpsCallable } from "firebase/functions";
import { LootCards } from "../game/types";

export type UseThiefRequest = {
  lobbyUID: string;
  cardToSteal: LootCards[];
};

export default async function activateTheif(useThiefRequest: UseThiefRequest) {
  const functions = getFunctions();
  const thiefApi = httpsCallable<UseThiefRequest, void>(functions, "useThief");

  try {
    await thiefApi(useThiefRequest);
  } catch (e) {
    console.error(e);
  }
}
