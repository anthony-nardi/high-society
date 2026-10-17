import callGameAction from "../../shared/callGameAction";
import type { Master } from "../game/types";

export type placeShangriLaMasterRequest = {
  lobbyUID: string;
  village: number;
  type: Master;
};

export default async function placeShangriLaMaster(
  request: placeShangriLaMasterRequest,
) {
  return callGameAction("placeShangriLaMaster", request);
}
