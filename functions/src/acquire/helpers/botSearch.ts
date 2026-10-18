import { AcquireGameState, AcquirePlayerState, Chain, Tile } from "../types";
import { ALL_TILES, bonusLevels, neighbours, TIER } from "./board";
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
  END_SIZE,
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
 * choices that follow, assumes others keep their shares, weighs what the
 * others could merge next, and picks the tile that leaves it best off
 * relative to the table. Shares are valued by the bonus ladder of the
 * mode in play, which is what makes Tycoon's third place worth chasing.
 */

export function cloneForSearch(gameState: AcquireGameState): AcquireGameState {
  return {
    public: JSON.parse(JSON.stringify(gameState.public)),
    private: { bag: [...(gameState.private.bag || [])], log: [] },
  };
}

/** How far along the game is, 0 to 1: tiles on the board over the whole set. */
export function progress(gameState: AcquireGameState) {
  return Object.keys(gameState.public.board || {}).length / ALL_TILES.length;
}

/** The bonus a player would collect from a chain if it paid out now. */
function bonusTo(gameState: AcquireGameState, chain: Chain, email: string) {
  return bonuses(gameState, chain).find(([e]) => e === email)?.[1] ?? 0;
}

/**
 * What one more share of a chain is worth to a player: the rise in the
 * bonus they would collect, plus the share's own resale value. The bonus
 * is paid when the chain is swallowed or the game ends, so it counts in
 * full; what shrinks it is the chance of being overtaken, which the hold
 * of the others against the shares left in the bank stands in for.
 */
export function marginalShareValue(
  gameState: AcquireGameState,
  chain: Chain,
  email: string,
) {
  const player = playerByEmail(gameState, email);
  if (!player) return 0;
  const before = bonusTo(gameState, chain, email);
  const copy = cloneForSearch(gameState);
  const me = playerByEmail(copy, email) as AcquirePlayerState;
  me.stocks = { ...(me.stocks || {}), [chain]: stockOf(me, chain) + 1 };
  const after = bonusTo(copy, chain, email);
  const price = currentPrice(gameState, chain);
  const size = gameState.public.chains[chain].size;
  // Smaller chains grow and so do their prices; safe chains only pay at the end.
  const growth = isSafe(gameState, chain) ? 0.05 : size <= 4 ? 0.45 : 0.25;
  const resale = price * (1 + growth);
  // A lead can be overtaken while shares remain in the bank.
  const left = gameState.public.chains[chain].stockLeft - 1;
  const contested = Math.min(1, left / 12) * 0.35;
  return (after - before) * (1 - contested) + resale;
}

/** Which chain to found: the dearest tier available, avoiding chains others already hold. */
export function chooseFounding(gameState: AcquireGameState): Chain {
  const email = gameState.public.activePlayer;
  const options = availableChains(gameState);
  const score = (c: Chain) => {
    const othersHold = gameState.public.players
      .filter((p) => p.email !== email)
      .reduce((n, p) => n + stockOf(p, c), 0);
    const me = playerByEmail(gameState, email);
    const mine = me ? stockOf(me, c) : 0;
    return TIER[c] * 2 + mine * 1.5 - othersHold;
  };
  return options.reduce(
    (best, c) => (score(c) > score(best) ? c : best),
    options[0],
  );
}

/** Which tied chain should survive: the one whose survival pays the bot most. */
export function chooseSurvivorFor(
  gameState: AcquireGameState,
  email: string,
  candidates: Chain[],
): Chain {
  const player = playerByEmail(gameState, email) as AcquirePlayerState;
  const score = (survivor: Chain) => {
    // The others are swallowed and pay out; the survivor's shares keep their value.
    let value = stockOf(player, survivor) * currentPrice(gameState, survivor);
    for (const c of candidates)
      if (c !== survivor) value += bonusTo(gameState, c, email);
    return value;
  };
  return candidates.reduce(
    (best, c) => (score(c) > score(best) ? c : best),
    candidates[0],
  );
}

/**
 * Settle absorbed shares: trade pairs while a survivor share is worth
 * more than two of the swallowed ones (resale plus the bonus position it
 * buys), sell the rest, and keep a few only when the chain is small enough
 * to come back soon.
 */
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
  let trade = 0;
  let pairs = Math.floor(held / 2);
  const copy = cloneForSearch(gameState);
  const me = playerByEmail(copy, email) as AcquirePlayerState;
  let survivorLeft = gameState.public.chains[merger.survivor].stockLeft;
  while (pairs > 0 && survivorLeft > 0) {
    const worth = marginalShareValue(copy, merger.survivor, email);
    if (worth <= 2 * price) break;
    me.stocks = {
      ...(me.stocks || {}),
      [merger.survivor]: stockOf(me, merger.survivor) + 1,
    };
    trade += 2;
    pairs -= 1;
    survivorLeft -= 1;
  }
  return { sell: held - trade, trade };
}

/**
 * What to buy: up to three shares, each the one with the best value for
 * its price, keeping a reserve that shrinks as the game goes on. Late in
 * the game anything that lifts a bonus position is worth more than cash.
 */
export function choosePurchases(
  gameState: AcquireGameState,
  email: string,
): { [chain in Chain]?: number } {
  const player = playerByEmail(gameState, email) as AcquirePlayerState;
  const purchases: { [chain in Chain]?: number } = {};
  const copy = cloneForSearch(gameState);
  const me = playerByEmail(copy, email) as AcquirePlayerState;
  let cash = player.money;
  let bought = gameState.public.bought;
  const late = progress(gameState);
  const reserve = Math.round(Math.max(0, 1000 * (1 - late)) / 100) * 100;
  for (let i = 0; i < MAX_BUY && bought < MAX_BUY; i++) {
    let best: Chain | null = null;
    let bestGain = 0;
    for (const chain of activeChains(copy)) {
      const price = currentPrice(copy, chain);
      if (copy.public.chains[chain].stockLeft <= 0) continue;
      if (price > cash - reserve) continue;
      const worth = marginalShareValue(copy, chain, email);
      // Money kept is worth a little more early, when it buys founding shares cheaply.
      const gain = worth - price * (1.15 - 0.3 * late);
      if (gain > bestGain) {
        bestGain = gain;
        best = chain;
      }
    }
    if (!best) break;
    purchases[best] = (purchases[best] || 0) + 1;
    me.stocks = { ...(me.stocks || {}), [best]: stockOf(me, best) + 1 };
    copy.public.chains[best].stockLeft -= 1;
    cash -= currentPrice(copy, best);
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

/** The bot's standing against the best of the others: worth plus the bonuses the board promises. */
export function standing(gameState: AcquireGameState, email: string) {
  const me = playerByEmail(gameState, email) as AcquirePlayerState;
  const rivals = gameState.public.players.filter((p) => p.email !== email);
  const weight = 0.45 + 0.5 * progress(gameState);
  const promised = (who: string) =>
    activeChains(gameState).reduce(
      (s, chain) => s + bonusTo(gameState, chain, who),
      0,
    );
  const best = Math.max(
    ...rivals.map((p) => netWorth(gameState, p) + weight * promised(p.email)),
  );
  return netWorth(gameState, me) + weight * promised(email) - best;
}

/** Empty squares where a tile would merge chains: what the others could spring next. */
function mergerSquares(gameState: AcquireGameState): Tile[] {
  const out: Tile[] = [];
  const board = gameState.public.board || {};
  for (const tile of ALL_TILES) {
    if (board[tile]) continue;
    const chains = new Set(
      neighbours(tile)
        .map((t) => board[t])
        .filter((c) => c && c !== "NONE"),
    );
    if (chains.size >= 2 && analyse(gameState, tile).kind === "merge")
      out.push(tile);
  }
  return out;
}

/** The worst a rival's merger could leave the bot, from this position. */
function threat(gameState: AcquireGameState, email: string, base: number) {
  const squares = mergerSquares(gameState);
  if (!squares.length) return base;
  const rival = gameState.public.players.find((p) => p.email !== email);
  if (!rival) return base;
  let worst = base;
  for (const tile of squares.slice(0, 12)) {
    const copy = cloneForSearch(gameState);
    copy.public.activePlayer = rival.email;
    copy.public.turnPlayer = rival.email;
    const r = playerByEmail(copy, rival.email) as AcquirePlayerState;
    r.tiles = [tile];
    if (!placeTile(copy, tile).ok) continue;
    settle(copy, email);
    worst = Math.min(worst, standing(copy, email));
  }
  return worst;
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
    const now = standing(copy, player.email);
    // A merger the others could spring next counts against the position.
    const exposed = threat(copy, player.email, now);
    let score = 0.7 * now + 0.3 * exposed;
    const kind = analyse(gameState, tile).kind;
    // A quiet tile keeps options open; founding is worth a little beyond the free share.
    if (kind === "lone") score += 50;
    if (kind === "found") score += 150;
    // Growing a chain towards 41 ends the game: only good when ahead.
    if (kind === "extend") {
      const size =
        copy.public.chains[(analyse(gameState, tile) as { chain: Chain }).chain]
          .size;
      if (size >= END_SIZE - 3 && now < 0) score -= 400;
    }
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
    (p) => [p.email, netWorth(copy, p)] as [string, number],
  );
  for (const chain of activeChains(copy)) {
    for (const [who, amount] of bonuses(copy, chain)) {
      const entry = worths.find(([e]) => e === who);
      if (entry) entry[1] += amount;
    }
  }
  let mine = 0;
  let best = 0;
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
      if (!gameState.public.declaredBy && shouldDeclare(gameState, email)) {
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
      if (!gameState.public.declaredBy && shouldDeclare(gameState, email)) {
        declareEnd(gameState);
        return;
      }
      buyStock(gameState, choosePurchases(gameState, email));
      return;
    }
  }
}

export { bonusLevels, SAFE_SIZE };
