import callGameAction from "../../shared/callGameAction";

export type declareAcquireEndRequest = { lobbyUID: string };

export default async function declareAcquireEnd(
  request: declareAcquireEndRequest,
) {
  return callGameAction("declareAcquireEnd", request);
}
