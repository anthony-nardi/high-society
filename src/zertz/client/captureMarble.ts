import callGameAction from "../../shared/callGameAction";
import type { Coord } from "../game/types";

export type CaptureMarbleRequest = { lobbyUID: string; from: Coord; to: Coord };

export default async function captureMarble(request: CaptureMarbleRequest) {
  await callGameAction("captureMarble", request);
}
