import callGameAction from "../../shared/callGameAction";

export type withdrawTigrisLeaderRequest = { lobbyUID: string; colour: string };

export default async function withdrawTigrisLeader(
  request: withdrawTigrisLeaderRequest,
) {
  return callGameAction("withdrawTigrisLeader", request);
}
