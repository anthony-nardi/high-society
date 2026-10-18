import callGameAction from "../../shared/callGameAction";

export type positionTigrisLeaderRequest = {
  lobbyUID: string;
  colour: string;
  cell: string;
};

export default async function positionTigrisLeader(
  request: positionTigrisLeaderRequest,
) {
  return callGameAction("positionTigrisLeader", request);
}
