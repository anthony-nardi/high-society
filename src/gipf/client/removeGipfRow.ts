import callGameAction from "../../shared/callGameAction";
import type { Coord } from "../game/types";

export type removeGipfRowRequest = { lobbyUID: string; coord: Coord };

export default async function removeGipfRow(request: removeGipfRowRequest) {
  return callGameAction("removeGipfRow", request);
}
