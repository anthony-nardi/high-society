import callGameAction from "../../shared/callGameAction";

export type passCondottiereRequest = { lobbyUID: string };

export default async function passCondottiere(request: passCondottiereRequest) {
  return callGameAction("passCondottiere", request);
}
