import { getFunctions, httpsCallable } from "firebase/functions";
import { LootCards } from "../game/types";

export type UseThiefRequest = {
  lobbyUID: string;
  cardToSteal: LootCards[];
};

export default async function useThief(useThiefRequest: UseThiefRequest) {
  const functions = getFunctions();
  const useThiefApi = httpsCallable<UseThiefRequest, void>(
    functions,
    "useThief"
  );

  try {
    await useThiefApi(useThiefRequest);
  } catch (e) {
    console.error(e);
  }
}
