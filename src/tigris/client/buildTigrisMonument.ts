import callGameAction from "../../shared/callGameAction";

export type buildTigrisMonumentRequest = {
  lobbyUID: string;
  cell: string;
  colours: [string, string];
};

export default async function buildTigrisMonument(
  request: buildTigrisMonumentRequest,
) {
  return callGameAction("buildTigrisMonument", request);
}
