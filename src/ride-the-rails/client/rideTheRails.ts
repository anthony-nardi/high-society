import callGameAction from "../../shared/callGameAction";
import type { Journey } from "../game/types";

export type rideTheRailsRequest = { lobbyUID: string; journey: Journey };

export default async function rideTheRails(request: rideTheRailsRequest) {
  return callGameAction("rideTheRails", request);
}
