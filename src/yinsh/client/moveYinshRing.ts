import callGameAction from "../../shared/callGameAction";
import type { Coord } from "../game/types";

export type moveYinshRingRequest = { lobbyUID: string; from: Coord; to: Coord };

export default async function moveYinshRing(request: moveYinshRingRequest) {
  await callGameAction("moveYinshRing", request);
}
