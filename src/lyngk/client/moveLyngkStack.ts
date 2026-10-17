import callGameAction from "../../shared/callGameAction";
import type { Coord } from "../game/types";

export type moveLyngkStackRequest = { lobbyUID: string; path: Coord[] };

export default async function moveLyngkStack(request: moveLyngkStackRequest) {
  return callGameAction("moveLyngkStack", request);
}
