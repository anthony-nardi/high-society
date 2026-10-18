import callGameAction from "../../shared/callGameAction";

export type swapTwixtSidesRequest = { lobbyUID: string };

export default async function swapTwixtSides(request: swapTwixtSidesRequest) {
  return callGameAction("swapTwixtSides", request);
}
