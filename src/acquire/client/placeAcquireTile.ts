import callGameAction from "../../shared/callGameAction";

export type placeAcquireTileRequest = { lobbyUID: string; tile: string };

export default async function placeAcquireTile(
  request: placeAcquireTileRequest,
) {
  return callGameAction("placeAcquireTile", request);
}
