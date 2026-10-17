import callGameAction from "../../shared/callGameAction";

export type passForSaleRequest = { lobbyUID: string };

export default async function passForSale(request: passForSaleRequest) {
  return callGameAction("passForSale", request);
}
