import callGameAction from "../../shared/callGameAction";
import type { Railroad } from "../game/types";

export type takeRideTheRailsShareRequest = {
  lobbyUID: string;
  railroad: Railroad;
};

export default async function takeRideTheRailsShare(
  request: takeRideTheRailsShareRequest,
) {
  return callGameAction("takeRideTheRailsShare", request);
}
