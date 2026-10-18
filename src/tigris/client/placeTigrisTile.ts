import callGameAction from "../../shared/callGameAction";

export type placeTigrisTileRequest = {
  lobbyUID: string;
  cell: string;
  colour: string;
};

export default async function placeTigrisTile(request: placeTigrisTileRequest) {
  return callGameAction("placeTigrisTile", request);
}
