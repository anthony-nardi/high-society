import callGameAction from "../../shared/callGameAction";

export type placeEcosystemCardRequest = {
  lobbyUID: string;
  card: number;
  row: number;
  col: number;
  swap?: [string, string];
};

export default async function placeEcosystemCard(
  request: placeEcosystemCardRequest,
) {
  return callGameAction("placeEcosystemCard", request);
}
