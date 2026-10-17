import callGameAction from "../../shared/callGameAction";
import type { Colour } from "../game/types";

export type claimLyngkColourRequest = { lobbyUID: string; colour: Colour };

export default async function claimLyngkColour(
  request: claimLyngkColourRequest,
) {
  return callGameAction("claimLyngkColour", request);
}
