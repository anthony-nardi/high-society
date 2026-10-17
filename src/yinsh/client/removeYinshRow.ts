import callGameAction from "../../shared/callGameAction";
import type { Coord } from "../game/types";

export type removeYinshRowRequest = {
  lobbyUID: string;
  from: Coord;
  to: Coord;
};

export default async function removeYinshRow(request: removeYinshRowRequest) {
  await callGameAction("removeYinshRow", request);
}
