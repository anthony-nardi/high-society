import callGameAction from "../../shared/callGameAction";
import type { Chain } from "../game/types";

export type foundAcquireChainRequest = { lobbyUID: string; chain: Chain };

export default async function foundAcquireChain(
  request: foundAcquireChainRequest,
) {
  return callGameAction("foundAcquireChain", request);
}
