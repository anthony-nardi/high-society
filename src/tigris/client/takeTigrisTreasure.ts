import callGameAction from "../../shared/callGameAction";

export type takeTigrisTreasureRequest = { lobbyUID: string; cell: string };

export default async function takeTigrisTreasure(
  request: takeTigrisTreasureRequest,
) {
  return callGameAction("takeTigrisTreasure", request);
}
