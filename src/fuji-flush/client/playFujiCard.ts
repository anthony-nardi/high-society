import callGameAction from "../../shared/callGameAction";

export type playFujiCardRequest = { lobbyUID: string; card: number };

export default async function playFujiCard(request: playFujiCardRequest) {
  return callGameAction("playFujiCard", request);
}
