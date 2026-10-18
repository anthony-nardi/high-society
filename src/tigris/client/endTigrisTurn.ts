import callGameAction from "../../shared/callGameAction";

export type endTigrisTurnRequest = { lobbyUID: string };

export default async function endTigrisTurn(request: endTigrisTurnRequest) {
  return callGameAction("endTigrisTurn", request);
}
