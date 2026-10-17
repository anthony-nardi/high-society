import callGameAction from "../../shared/callGameAction";
import type { Coord } from "../game/types";

export type placeYinshRingRequest = { lobbyUID: string; coord: Coord };

export default async function placeYinshRing(request: placeYinshRingRequest) {
  await callGameAction("placeYinshRing", request);
}
