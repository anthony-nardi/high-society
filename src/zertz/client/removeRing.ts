import callGameAction from "../../shared/callGameAction";
import type { Coord } from "../game/types";

export type RemoveRingRequest = { lobbyUID: string; coord: Coord };

export default async function removeRing(request: RemoveRingRequest) {
  await callGameAction("removeRing", request);
}
