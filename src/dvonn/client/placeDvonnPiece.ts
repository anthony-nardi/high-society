import callGameAction from "../../shared/callGameAction";
import type { Coord } from "../game/types";

export type placeDvonnPieceRequest = { lobbyUID: string; coord: Coord };

export default async function placeDvonnPiece(request: placeDvonnPieceRequest) {
  return callGameAction("placeDvonnPiece", request);
}
