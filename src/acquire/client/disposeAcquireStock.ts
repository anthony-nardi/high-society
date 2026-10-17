import callGameAction from "../../shared/callGameAction";

export type disposeAcquireStockRequest = {
  lobbyUID: string;
  sell: number;
  trade: number;
};

export default async function disposeAcquireStock(
  request: disposeAcquireStockRequest,
) {
  return callGameAction("disposeAcquireStock", request);
}
