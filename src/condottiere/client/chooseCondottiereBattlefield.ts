import callGameAction from "../../shared/callGameAction";

export type chooseCondottiereBattlefieldRequest = {
  lobbyUID: string;
  region: number;
};

export default async function chooseCondottiereBattlefield(
  request: chooseCondottiereBattlefieldRequest,
) {
  return callGameAction("chooseCondottiereBattlefield", request);
}
