import callGameAction from "../../shared/callGameAction";

export type PassTurnRequest = {
  lobbyUID: number;
};

export default async function passTurn(request: PassTurnRequest) {
  await callGameAction("passturn", request);
}
