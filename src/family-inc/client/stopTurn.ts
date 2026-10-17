import callGameAction from "../../shared/callGameAction";

export type StopTurnRequest = { lobbyUID: string };

export default async function stopTurn(request: StopTurnRequest) {
  await callGameAction("stopTurn", request);
}
