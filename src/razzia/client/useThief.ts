import callFunction from "./callFunction";
import { LootCards } from "../game/types";

export type UseThiefRequest = {
  lobbyUID: string;
  cardToSteal: LootCards[];
};

export default async function activateThief(request: UseThiefRequest) {
  await callFunction<UseThiefRequest>("useThief", request);
}
