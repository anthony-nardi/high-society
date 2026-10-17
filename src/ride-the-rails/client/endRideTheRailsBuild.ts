import callGameAction from "../../shared/callGameAction";

export type endRideTheRailsBuildRequest = { lobbyUID: string };

export default async function endRideTheRailsBuild(
  request: endRideTheRailsBuildRequest,
) {
  return callGameAction("endRideTheRailsBuild", request);
}
