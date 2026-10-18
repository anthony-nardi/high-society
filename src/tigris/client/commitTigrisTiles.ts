import callGameAction from "../../shared/callGameAction";

export type commitTigrisTilesRequest = { lobbyUID: string; count: number };

export default async function commitTigrisTiles(
  request: commitTigrisTilesRequest,
) {
  return callGameAction("commitTigrisTiles", request);
}
