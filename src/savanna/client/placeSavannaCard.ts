import callGameAction from "../../shared/callGameAction";

export type placeSavannaCardRequest = {
  lobbyUID: string;
  card: number;
  row: number;
  col: number;
};

export default async function placeSavannaCard(
  request: placeSavannaCardRequest,
) {
  return callGameAction("placeSavannaCard", request);
}
