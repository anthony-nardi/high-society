import callGameAction from "../../shared/callGameAction";

export type sellForSaleRequest = { lobbyUID: string; property: number };

export default async function sellForSale(request: sellForSaleRequest) {
  return callGameAction("sellForSale", request);
}
