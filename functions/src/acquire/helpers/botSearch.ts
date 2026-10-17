import { AcquireGameState, AcquirePlayerState, Chain, Tile } from "../types";
import { CHAINS, TIER } from "./board";
import {
  activeChains,
  analyse,
  availableChains,
  bonuses,
  buyStock,
  canDeclare,
  chooseSurvivor,
  currentPrice,
  declareEnd,
  dispose,
  foundChain,
  getActivePlayer,
  isSafe,
  MAX_BUY,
  netWorth,
  placeTile,
  playableTiles,
  playerByEmail,
  SAFE_SIZE,
  stockOf,
} from "./rules";

/*
 * Bot decision making for Acquire. Hidden hands and a long horizon make a
 * tree search a poor fit, so the bot is a one-ply planner: it plays each
 * tile it could on a copy of the game, follows its own policies for the
 * choices that follow, assumes others keep their shares, and picks the
 * tile that leaves it best off relative to the table.
 */

export function cloneForSearch(gameState: AcquireGameState): AcquireGameState {
  return {
    public: JSON.parse(JSON.stringify(gameState.public)),
    private: { bag: [...(gameState.private.bag || [])], log: [] },
  };
}

/** Which chain to found: the dearest tier available. */
export function chooseFounding(gameState: AcquireGameState): Chain {
  const options = availableChains(gameState);
  return options.reduce(
    (best, c) => (TIER[c] > TIER[best] ? c : best),
    options[0],
  );
}

/** Which tied chain should survive: the one the bot holds most of. */
export function chooseSurvivorFor(
  gameState: AcquireGameState,
  email: string,
  candidates: Chain[],
): Chain {
  const player = playerByEmail(gameState, email) as AcquirePlayerState;
  return candidates.reduce(
    (best, c) => (stockOf(player, c) > stockOf(player, best) ? c : best),
    candidates[0],
  );
}

/** Settle absorbed shares: trade pairs while the survivor is worth more than two of them, sell the rest. */
export function chooseDisposal(
  gameState: AcquireGameState,
  email: string,
): { sell: number; trade: number } {
  const merger = gameState.public.merger;
  const player = playerByEmail(gameState, email);
  if (!merger?.current || !merger.survivor || !player)
    return { sell: 0, trade: 0 };
  const held = stockOf(player, merger.current);
  const price = merger.price ?? currentPrice(gameState, merger.current);
  const survivorPrice = currentPrice(gameState, merger.survivor);
  let trade = 0;
  if (survivorPrice > 2 * price && !isSafe(gameState, merger.survivor)) {
    trade = Math.min(
      held - (held % 2),
      gameState.public.chains[merger.survivor].stockLeft * 2,
    );
  }
  return { sell: held - trade, trade };
}

/** What to buy: chains where a share moves the bot up the bonus ladder, cheapest first, keeping a reserve. */
export function choosePurchases(
  gameState: AcquireGameState,
  email: string,
): { [chain in Chain]?: number } {
  const player = playerByEmail(gameState, email) as AcquirePlayerState;
  const purchases: { [chain in Chain]?: number } = {};
  let cash = player.money;
  let bought = gameState.public.bought;
  const reserve = 500;
  for (let i = 0; i < MAX_BUY; i++) {
    let best: Chain | null = null;
    let bestScore = 0;
    for (const chain of activeChains(gameState)) {
      const price = currentPrice(gameState, chain);
      const left =
        gameState.public.chains[chain].stockLeft - (purchases[chain] || 0);
      if (left <= 0 || price > cash - reserve || bought >= MAX_BUY) continue;
      const mine = stockOf(player, chain) + (purchases[chain] || 0);
      const others = gameState.public.players
        .filter((p) => p.email !== email)
        .map((p) => stockOf(p, chain));
      const top = Math.max(0, ...others);
      const size = gameState.public.chains[chain].size;
      let score = 0;
      if (mine + 1 > top)
        score += 6; // leads the majority race
      else if (mine + 1 === top) score += 4;
      else if (mine + 1 >= Math.max(1, others.sort((a, b) => b - a)[1] ?? 0))
        score += 2; // in the minority race
      score += size < SAFE_SIZE ? 2 : 1; // room to grow pays
      score -= price / 400; // dearer shares need more reason
      if (score > bestScore) {
        bestScore = score;
        best = chain;
      }
    }
    if (!best) break;
    purchases[best] = (purchases[best] || 0) + 1;
    cash -= currentPrice(gameState, best);
    bought += 1;
  }
  return purchases;
}

/** Run the bot's own policies through any choices a placement opened up, others keeping their shares. */
function settle(gameState: AcquireGameState, email: string) {
  let guard = 40;
  while (guard-- > 0 && gameState.public.status === "IN_PROGRESS") {
    const phase = gameState.public.phase;
    if (phase === "FOUND") {
      foundChain(gameState, chooseFounding(gameState));
    } else if (phase === "SURVIVOR") {
      chooseSurvivor(
        gameState,
        chooseSurvivorFor(
          gameState,
          email,
          gameState.public.merger?.candidates || [],
        ),
      );
    } else if (phase === "DISPOSE") {
      const who = gameState.public.activePlayer;
      const d =
        who === email ? chooseDisposal(gameState, who) : { sell: 0, trade: 0 };
      dispose(gameState, who, d.sell, d.trade);
    } else {
      return;
    }
  }
}

/** The bot's standing against the best of the others, after a placement. */
function standing(gameState: AcquireGameState, email: string) {
  const me = playerByEmail(gameState, email) as AcquirePlayerState;
  const rivals = gameState.public.players.filter((p) => p.email !== email);
  const best = Math.max(...rivals.map((p) => netWorth(gameState, p)));
  // Add the bonuses the bot would collect if every chain paid out now, weighted lightly.
  let pending = 0;
  for (const chain of activeChains(gameState)) {
    for (const [who, amount] of bonuses(gameState, chain)) {
      if (who === email) pending += amount;
      else pending -= amount / Math.max(1, rivals.length);
    }
  }
  return netWorth(gameState, me) - best + 0.35 * pending;
}

/** The tile to play, or null when none can be. */
export function chooseTile(gameState: AcquireGameState): Tile | null {
  const player = getActivePlayer(gameState);
  if (!player) return null;
  const options = playableTiles(gameState, player);
  if (!options.length) return null;
  let best = options[0];
  let bestScore = -Infinity;
  for (const tile of options) {
    const copy = cloneForSearch(gameState);
    const result = placeTile(copy, tile);
    if (!result.ok) continue;
    settle(copy, player.email);
    let score = standing(copy, player.email);
    const kind = analyse(gameState, tile).kind;
    // A quiet tile keeps options open; founding is worth a little for the free share.
    if (kind === "lone") score += 50;
    if (kind === "found") score += 150;
    if (score > bestScore) {
      bestScore = score;
      best = tile;
    }
  }
  return best;
}

/** Call the end only when the bot would win it. */
export function shouldDeclare(gameState: AcquireGameState, email: string) {
  if (!canDeclare(gameState)) return false;
  const copy = cloneForSearch(gameState);
  const worths = copy.public.players.map(
    (p) =>
      [p.email, netWorth(copy, p) + bonuses(copy, CHAINS[0]).length * 0] as [
        string,
        number,
      ],
  );
  let mine = 0;
  let best = 0;
  for (const chain of activeChains(copy)) {
    for (const [who, amount] of bonuses(copy, chain)) {
      const entry = worths.find(([e]) => e === who);
      if (entry) entry[1] += amount;
    }
  }
  for (const [who, worth] of worths) {
    if (who === email) mine = worth;
    else best = Math.max(best, worth);
  }
  return mine > best;
}

/** Everything the bot does on its own turn, in order. */
export function takeBotStep(gameState: AcquireGameState) {
  const player = getActivePlayer(gameState);
  if (!player) return;
  const email = player.email;
  switch (gameState.public.phase) {
    case "PLACE": {
      if (shouldDeclare(gameState, email)) {
        declareEnd(gameState);
        return;
      }
      const tile = chooseTile(gameState);
      if (tile) placeTile(gameState, tile);
      else gameState.public.phase = "BUY";
      return;
    }
    case "FOUND":
      foundChain(gameState, chooseFounding(gameState));
      return;
    case "SURVIVOR":
      chooseSurvivor(
        gameState,
        chooseSurvivorFor(
          gameState,
          email,
          gameState.public.merger?.candidates || [],
        ),
      );
      return;
    case "DISPOSE": {
      const d = chooseDisposal(gameState, email);
      dispose(gameState, email, d.sell, d.trade);
      return;
    }
    case "BUY": {
      if (shouldDeclare(gameState, email)) {
        declareEnd(gameState);
        return;
      }
      buyStock(gameState, choosePurchases(gameState, email));
      return;
    }
  }
}
