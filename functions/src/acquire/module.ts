import { GameModule } from "../shared/game";
import { AcquireGameState, Chain } from "./types";
import {
  buildAcquireGameState,
  buyStock,
  chooseSurvivor,
  declareEnd,
  dispose,
  foundChain,
  isGameOver,
  placeTile,
} from "./helpers/rules";
import { takeBotTurn } from "./helpers/bot";

const asPurchases = (raw: unknown): { [chain in Chain]?: number } => {
  if (!raw || typeof raw !== "object") return {};
  const out: { [chain in Chain]?: number } = {};
  for (const [chain, n] of Object.entries(raw as Record<string, unknown>)) {
    out[chain as Chain] = Number(n);
  }
  return out;
};

const acquire: GameModule<AcquireGameState> = {
  name: "acquire",
  createState: (lobbyUID, players) => buildAcquireGameState(lobbyUID, players),
  actions: {
    placeAcquireTile: (state, payload: { tile?: string }) =>
      placeTile(state, String(payload?.tile ?? "")),
    foundAcquireChain: (state, payload: { chain?: Chain }) =>
      foundChain(state, String(payload?.chain ?? "") as Chain),
    chooseAcquireSurvivor: (state, payload: { chain?: Chain }) =>
      chooseSurvivor(state, String(payload?.chain ?? "") as Chain),
    disposeAcquireStock: (
      state,
      payload: { sell?: number; trade?: number; callerEmail?: string },
    ) =>
      dispose(
        state,
        String(payload?.callerEmail ?? ""),
        Number(payload?.sell ?? 0),
        Number(payload?.trade ?? 0),
      ),
    buyAcquireStock: (state, payload: { purchases?: unknown }) =>
      buyStock(state, asPurchases(payload?.purchases)),
    declareAcquireEnd: (state) => declareEnd(state),
  },
  isGameOver,
  botTurn: (state) => takeBotTurn(state),
  botPauseMs: 1100,
};

export default acquire;
