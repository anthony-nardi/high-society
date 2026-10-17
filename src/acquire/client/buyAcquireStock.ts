import callGameAction from "../../shared/callGameAction";
import type { Chain } from "../game/types";

export type buyAcquireStockRequest = {
  lobbyUID: string;
  purchases: { [chain in Chain]?: number };
};

export default async function buyAcquireStock(request: buyAcquireStockRequest) {
  return callGameAction("buyAcquireStock", request);
}
