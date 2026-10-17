import callGameAction from "../../shared/callGameAction";
import type { Chain } from "../game/types";

export type chooseAcquireSurvivorRequest = { lobbyUID: string; chain: Chain };

export default async function chooseAcquireSurvivor(
  request: chooseAcquireSurvivorRequest,
) {
  return callGameAction("chooseAcquireSurvivor", request);
}
