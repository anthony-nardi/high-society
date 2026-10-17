import callGameAction from "../../shared/callGameAction";
import type { Railroad } from "../game/types";

export type buildRideTheRailsTrackRequest = {
  lobbyUID: string;
  railroad: Railroad;
  hex: number;
};

export default async function buildRideTheRailsTrack(
  request: buildRideTheRailsTrackRequest,
) {
  return callGameAction("buildRideTheRailsTrack", request);
}
