import callGameAction from "../../shared/callGameAction";

export type placeTwixtPegRequest = { lobbyUID: string; hole: number };

export default async function placeTwixtPeg(request: placeTwixtPegRequest) {
  return callGameAction("placeTwixtPeg", request);
}
