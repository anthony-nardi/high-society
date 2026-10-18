import callGameAction from "../../shared/callGameAction";

export type chooseTigrisWarRequest = { lobbyUID: string; colour: string };

export default async function chooseTigrisWar(request: chooseTigrisWarRequest) {
  return callGameAction("chooseTigrisWar", request);
}
