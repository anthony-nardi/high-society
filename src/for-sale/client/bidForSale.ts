import callGameAction from "../../shared/callGameAction";

export type bidForSaleRequest = { lobbyUID: string; amount: number };

export default async function bidForSale(request: bidForSaleRequest) {
  return callGameAction("bidForSale", request);
}
