import callGameAction from "../../shared/callGameAction";

export type LobbyRequest = { lobbyUID: string };
export type BidRequest = { lobbyUID: string; amount: number };

/** The auctioneer turns the top card over onto the lot. */
export async function drawMediciCard(request: LobbyRequest) {
  return callGameAction("drawMediciCard", request);
}

/** The auctioneer stops drawing and puts the lot up. */
export async function offerMediciLot(request: LobbyRequest) {
  return callGameAction("offerMediciLot", request);
}

export async function bidMedici(request: BidRequest) {
  return callGameAction("bidMedici", request);
}

export async function passMedici(request: LobbyRequest) {
  return callGameAction("passMedici", request);
}
