import callGameAction from "../../shared/callGameAction";

export type playCondottiereCardRequest = {
  lobbyUID: string;
  index: number;
  target?: number;
};

export default async function playCondottiereCard(
  request: playCondottiereCardRequest,
) {
  return callGameAction("playCondottiereCard", request);
}
