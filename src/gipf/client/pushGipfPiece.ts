import callGameAction from "../../shared/callGameAction";
import type { Coord } from "../game/types";

export type pushGipfPieceRequest = { lobbyUID: string; from: Coord; to: Coord };

export default async function pushGipfPiece(request: pushGipfPieceRequest) {
  return callGameAction("pushGipfPiece", request);
}
