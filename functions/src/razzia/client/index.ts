import {
  CallableRequest,
  HttpsError,
  onCall,
} from "firebase-functions/v2/https";

// A human move may be followed by a chain of bot moves, each paused so it
// can be read at the table, so give the request plenty of time.
const MOVE_OPTIONS = { timeoutSeconds: 300 };
import {
  getEmailFromRequest,
  getGameState,
  isActivePlayerTakingAction,
  verifyRequestAuthentication,
} from "../../high-society/helpers";
import { LootCards, RazziaGameState } from "../types";
import {
  ActionResult,
  bid,
  initiateAuction,
  pass,
  revealCard,
  saveGameState,
  useThief,
} from "../helpers";
import { isActivePlayerBot, maybeTakeBotTurn } from "../helpers/bot";

// Bots may take many turns in a row (reveals, a whole auction), so after a
// human acts let them play on, up to a sensible cap.
async function letBotsPlay(gameState: RazziaGameState) {
  let attempts = 40;
  while (
    gameState.public.status !== "GAME_OVER" &&
    isActivePlayerBot(gameState) &&
    attempts > 0
  ) {
    attempts--;
    await maybeTakeBotTurn(gameState);
  }
}

async function run(
  request: CallableRequest<{ lobbyUID: string }>,
  action: (gameState: RazziaGameState) => ActionResult,
) {
  verifyRequestAuthentication(request);

  const requestEmail = getEmailFromRequest(request);
  const gameState = await getGameState<RazziaGameState>(request.data.lobbyUID);

  if (!gameState || !isActivePlayerTakingAction(gameState, requestEmail)) {
    return;
  }

  const result = action(gameState);
  if (!result.ok) {
    throw new HttpsError("failed-precondition", result.reason);
  }

  await saveGameState(gameState);
  await letBotsPlay(gameState);
  return {};
}

export const revealCardFn = onCall(
  MOVE_OPTIONS,
  async (request: CallableRequest<{ lobbyUID: string }>) =>
    run(request, revealCard),
);

export const initiateAuctionFn = onCall(
  MOVE_OPTIONS,
  async (request: CallableRequest<{ lobbyUID: string }>) =>
    run(request, initiateAuction),
);

export const useThiefFn = onCall(
  MOVE_OPTIONS,
  async (
    request: CallableRequest<{ lobbyUID: string; cardToSteal: LootCards[] }>,
  ) =>
    run(request, (gameState) =>
      useThief(gameState, request.data.cardToSteal || []),
    ),
);

export const passOnLootFn = onCall(
  MOVE_OPTIONS,
  async (request: CallableRequest<{ lobbyUID: string }>) => run(request, pass),
);

export const bidOnLootFn = onCall(
  MOVE_OPTIONS,
  async (request: CallableRequest<{ lobbyUID: string; amount: string }>) =>
    run(request, (gameState) => bid(gameState, String(request.data.amount))),
);

export {
  revealCardFn as revealCard,
  initiateAuctionFn as initiateAuction,
  useThiefFn as useThief,
  passOnLootFn as passOnLoot,
  bidOnLootFn as bidOnLoot,
};
