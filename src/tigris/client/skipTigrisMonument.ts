import callGameAction from "../../shared/callGameAction";

export type skipTigrisMonumentRequest = { lobbyUID: string };

export default async function skipTigrisMonument(
  request: skipTigrisMonumentRequest,
) {
  return callGameAction("skipTigrisMonument", request);
}
