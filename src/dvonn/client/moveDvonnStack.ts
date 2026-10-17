import callGameAction from "../../shared/callGameAction";
import type { Coord } from "../game/types";

export type moveDvonnStackRequest = {
  lobbyUID: string;
  from: Coord;
  to: Coord;
};

export default async function moveDvonnStack(request: moveDvonnStackRequest) {
  return callGameAction("moveDvonnStack", request);
}
