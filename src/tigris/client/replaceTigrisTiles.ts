import callGameAction from "../../shared/callGameAction";

export type replaceTigrisTilesRequest = { lobbyUID: string; indexes: number[] };

export default async function replaceTigrisTiles(
  request: replaceTigrisTilesRequest,
) {
  return callGameAction("replaceTigrisTiles", request);
}
