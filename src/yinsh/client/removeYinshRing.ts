import callGameAction from "../../shared/callGameAction";
import type { Coord } from "../game/types";

export type removeYinshRingRequest = { lobbyUID: string; coord: Coord };

export default async function removeYinshRing(request: removeYinshRingRequest) {
  return callGameAction("removeYinshRing", request);
}
