import callGameAction from "../../shared/callGameAction";

export type placeCoralReefCardRequest = {
  lobbyUID: string;
  card: number;
  row: number;
  col: number;
  swap?: [string, string];
  move?: [string, string];
};

export default async function placeCoralReefCard(
  request: placeCoralReefCardRequest,
) {
  return callGameAction("placeCoralReefCard", request);
}
