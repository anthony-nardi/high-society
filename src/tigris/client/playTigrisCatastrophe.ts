import callGameAction from "../../shared/callGameAction";

export type playTigrisCatastropheRequest = { lobbyUID: string; cell: string };

export default async function playTigrisCatastrophe(
  request: playTigrisCatastropheRequest,
) {
  return callGameAction("playTigrisCatastrophe", request);
}
