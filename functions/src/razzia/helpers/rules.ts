import {
  BUSINESSES,
  CardCategory,
  JEWELS,
  LootCards,
  LOOT_CARDS,
  PlayerCards,
  RazziaGameState,
  RazziaPlayerState,
  ScoreBreakdown,
} from "../types";
import { Notification } from "../../shared/types";
import { LogEntry } from "../../high-society/types";

/*
 * Pure rules for Razzia!: everything here mutates the game state object it
 * is given and never touches the database, so it can be unit tested and
 * driven by the bot search.
 */

/** The seventh loot card on the table triggers an automatic auction. */
export const MAX_REVEALED_CARDS = 7;
export const ROUNDS = 3;

/** Police cards that end the round: the seventh, or the fifth with two players. */
export function raidLimitFor(playerCount: number) {
  return playerCount === 2 ? 5 : 7;
}

export function categoryOf(card: LootCards): CardCategory | null {
  if (JEWELS.includes(card)) return "jewels";
  if (BUSINESSES.includes(card)) return "businesses";
  switch (card) {
    case LOOT_CARDS.BODYGUARDS:
      return "bodyguards";
    case LOOT_CARDS.COINS:
      return "coins";
    case LOOT_CARDS.THIEF:
      return "theives";
    case LOOT_CARDS.CARS:
      return "cars";
    case LOOT_CARDS.DRIVERS:
      return "drivers";
    default:
      return null;
  }
}

export function emptyCards(): Required<PlayerCards> {
  return {
    jewels: [],
    bodyguards: [],
    coins: [],
    theives: [],
    cars: [],
    drivers: [],
    businesses: [],
  };
}

export function addCardToPlayer(player: RazziaPlayerState, card: LootCards) {
  const category = categoryOf(card);
  if (!category) return;
  player.cards = player.cards || {};
  player.cards[category] = [...(player.cards[category] || []), card];
}

export function appendLog(gameState: RazziaGameState, entry: LogEntry) {
  gameState.private.log = [...(gameState.private.log || []), entry];
}

export function publishLog(gameState: RazziaGameState) {
  gameState.public.log = gameState.private.log || [];
}

function announce(gameState: RazziaGameState, title: string, message?: string) {
  const notification: Notification = { timestamp: Date.now(), title };
  if (message) notification.message = message;
  gameState.public.notification = notification;
  appendLog(gameState, notification);
}

export function getActivePlayer(gameState: RazziaGameState) {
  return gameState.public.players.find(
    (player) => player.email === gameState.public.activePlayer
  );
}

export function getPlayerIndex(gameState: RazziaGameState, email: string) {
  return gameState.public.players.findIndex((player) => player.email === email);
}

/** Next player, clockwise, who still has money to bid; -1 if nobody does. */
export function getNextPlayerIndex(gameState: RazziaGameState) {
  const players = gameState.public.players;
  const start = getPlayerIndex(gameState, gameState.public.activePlayer);
  for (let step = 1; step <= players.length; step++) {
    const index = (start + step) % players.length;
    if ((players[index].availableMoney || []).length > 0) {
      return index;
    }
  }
  return -1;
}

export function updateActivePlayer(gameState: RazziaGameState) {
  const next = getNextPlayerIndex(gameState);
  if (next !== -1) {
    gameState.public.activePlayer = gameState.public.players[next].email;
  }
}

export function anyoneHasMoney(gameState: RazziaGameState) {
  return gameState.public.players.some(
    (player) => (player.availableMoney || []).length > 0
  );
}

export function highestBid(gameState: RazziaGameState) {
  return Math.max(
    0,
    ...gameState.public.players.map((player) => Number(player.bid) || 0)
  );
}

export function getPlayerWithHighestBid(gameState: RazziaGameState) {
  const best = highestBid(gameState);
  if (best === 0) return undefined;
  return gameState.public.players.find((player) => Number(player.bid) === best);
}

export function isAuction(gameState: RazziaGameState) {
  return (
    gameState.public.roundState === "NORMAL_AUCTION" ||
    gameState.public.roundState === "FORCED_AUCTION"
  );
}

/** Money cards the player may bid now: available and above the table. */
export function biddableMoney(gameState: RazziaGameState, player: RazziaPlayerState) {
  const floor = highestBid(gameState);
  return (player.availableMoney || []).filter((money) => Number(money) > floor);
}

/**
 * The caller of a normal auction must bid if nobody else has; everyone
 * else, and the caller of a forced auction, may pass.
 */
export function canPass(gameState: RazziaGameState, player: RazziaPlayerState) {
  if (player.email !== gameState.public.auctionTriggeringPlayer) return true;
  if (gameState.public.roundState === "FORCED_AUCTION") return true;
  return highestBid(gameState) > 0 || biddableMoney(gameState, player).length === 0;
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

function count(cards: LootCards[] | undefined) {
  return (cards || []).length;
}

/** Points scored at the end of every round (jewels, bodyguards, coins, cars, thieves). */
export function roundPoints(
  player: RazziaPlayerState,
  everyone: RazziaPlayerState[]
): { [category: string]: number } {
  const cards = player.cards || {};
  const points: { [category: string]: number } = {};

  const jewelKinds = new Set(cards.jewels || []).size;
  if (jewelKinds === 0) points.jewels = -5;
  else if (jewelKinds >= 5) points.jewels = 15;
  else if (jewelKinds === 4) points.jewels = 10;
  else if (jewelKinds === 3) points.jewels = 5;
  else points.jewels = 0;

  const guards = everyone.map((p) => count(p.cards?.bodyguards));
  const most = Math.max(...guards);
  const fewest = Math.min(...guards);
  const mine = count(cards.bodyguards);
  if (most !== fewest) {
    if (mine === most) points.bodyguards = 5;
    else if (mine === fewest) points.bodyguards = -2;
    else points.bodyguards = 0;
  } else {
    points.bodyguards = 0;
  }

  points.coins = count(cards.coins) * 3;

  // Cars only pay out while the player has a driver; drivers always pay.
  const drivers = count(cards.drivers);
  points.cars = drivers > 0 ? count(cards.cars) : 0;
  points.drivers = drivers;

  points.thieves = count(cards.theives) * 2;

  return points;
}

/** Points scored only at the end of the game (businesses and money). */
export function finalPoints(
  player: RazziaPlayerState,
  everyone: RazziaPlayerState[]
): { [category: string]: number } {
  const points: { [category: string]: number } = {};
  const businesses = player.cards?.businesses || [];

  // 1 to 6 different kinds score 1 to 6; all 7 score 10. Three of a kind
  // adds 5 and four of a kind adds 10, for each kind.
  const kinds = new Set(businesses).size;
  let businessPoints = kinds >= 7 ? 10 : kinds;

  const perKind: { [kind: string]: number } = {};
  for (const business of businesses) {
    perKind[business] = (perKind[business] || 0) + 1;
  }
  for (const n of Object.values(perKind)) {
    if (n >= 4) businessPoints += 10;
    else if (n === 3) businessPoints += 5;
  }
  points.businesses = businessPoints;

  const totals = everyone.map((p) =>
    (p.money || []).reduce((sum, m) => sum + Number(m), 0)
  );
  const mine = (player.money || []).reduce((sum, m) => sum + Number(m), 0);
  const most = Math.max(...totals);
  const least = Math.min(...totals);
  if (most !== least) {
    if (mine === most) points.money = 5;
    else if (mine === least) points.money = -5;
    else points.money = 0;
  } else {
    points.money = 0;
  }

  return points;
}

function recordScores(
  gameState: RazziaGameState,
  compute: (player: RazziaPlayerState) => { [category: string]: number }
) {
  gameState.public.scoring = gameState.public.scoring || [];
  for (const player of gameState.public.players) {
    const points = compute(player);
    const total = Object.values(points).reduce((sum, n) => sum + n, 0);
    player.score = (player.score || 0) + total;
    const breakdown: ScoreBreakdown = {
      email: player.email,
      round: gameState.public.round,
      points,
      total,
    };
    gameState.public.scoring.push(breakdown);
  }
}

/** Everything but bodyguards, cars and businesses leaves the table at round end. */
function discardRoundCards(player: RazziaPlayerState) {
  const cards = player.cards || {};
  player.cards = {
    ...emptyCards(),
    bodyguards: cards.bodyguards || [],
    cars: cards.cars || [],
    businesses: cards.businesses || [],
  };
}

export function startingPlayerForNewRound(gameState: RazziaGameState) {
  let best = "";
  let highest = 0;
  for (const player of gameState.public.players) {
    for (const money of player.money || []) {
      if (Number(money) > highest) {
        highest = Number(money);
        best = player.email;
      }
    }
  }
  return best;
}

/** Scores the round, then either sets up the next one or ends the game. */
export function endRound(gameState: RazziaGameState) {
  const players = gameState.public.players;
  const round = gameState.public.round;

  recordScores(gameState, (player) => roundPoints(player, players));

  gameState.public.revealedCards = [];
  gameState.public.policeRaids = 0;
  for (const player of players) player.bid = "0";

  if (round >= ROUNDS) {
    recordScores(gameState, (player) => finalPoints(player, players));
    gameState.public.roundState = "SCORING";
    gameState.public.status = "GAME_OVER";
    announce(gameState, "Round 3 is over. Game over.", "Final scores are in.");
    publishLog(gameState);
    return;
  }

  for (const player of players) {
    discardRoundCards(player);
    player.availableMoney = [...(player.money || [])];
  }
  gameState.public.round = (round + 1) as 1 | 2 | 3;
  gameState.public.roundState = "ACTION";
  gameState.public.auctionTriggeringPlayer = undefined;
  const starter = startingPlayerForNewRound(gameState);
  if (starter) gameState.public.activePlayer = starter;
  announce(
    gameState,
    `Round ${round} is over. Round ${round + 1} begins.`,
    `${starter} holds the highest money card and starts.`
  );
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export type ActionResult = { ok: true } | { ok: false; reason: string };

const fail = (reason: string): ActionResult => ({ ok: false, reason });

export function canReveal(gameState: RazziaGameState) {
  return (
    gameState.public.roundState === "ACTION" &&
    gameState.private.deck.length > 0
  );
}

/**
 * Draws the top card. Loot joins the table; the seventh loot card starts an
 * automatic auction whose unsold loot is discarded. A police card starts a
 * normal auction, and the final police card ends the round at once.
 */
export function revealCard(gameState: RazziaGameState): ActionResult {
  if (gameState.public.roundState !== "ACTION") return fail("Not in the action phase.");
  const revealed = gameState.public.revealedCards || [];
  const actor = gameState.public.activePlayer;

  const card = gameState.private.deck.shift();
  if (!card) {
    // Not covered by the rulebook, which re-splits two piles instead; the
    // only sane outcome is to score what everyone holds.
    announce(gameState, "The deck is exhausted.", "The round ends.");
    endRound(gameState);
    return { ok: true };
  }
  gameState.public.remainingCards = gameState.private.deck.length;

  if (card !== LOOT_CARDS.POLICE_RAIDS) {
    gameState.public.revealedCards = [...revealed, card];
    if (gameState.public.revealedCards.length >= MAX_REVEALED_CARDS) {
      gameState.public.roundState = "FORCED_AUCTION";
      gameState.public.auctionTriggeringPlayer = actor;
      gameState.public.discardIfUnsold = true;
      announce(
        gameState,
        `${actor} revealed ${card}, the seventh card on the table.`,
        "An auction starts automatically; if nobody bids the loot is discarded."
      );
    } else {
      announce(gameState, `${actor} revealed ${card}.`);
    }
    updateActivePlayer(gameState);
    return { ok: true };
  }

  gameState.public.policeRaids += 1;
  if (gameState.public.policeRaids >= gameState.public.raidLimit) {
    announce(
      gameState,
      `${actor} drew the final police raid.`,
      "The round ends at once; loot still on the table is lost."
    );
    endRound(gameState);
    return { ok: true };
  }

  gameState.public.roundState = "FORCED_AUCTION";
  gameState.public.auctionTriggeringPlayer = actor;
  gameState.public.discardIfUnsold = false;
  announce(
    gameState,
    `${actor} drew a police raid (${gameState.public.policeRaids} of ${gameState.public.raidLimit}).`,
    "The loot goes up for auction."
  );
  updateActivePlayer(gameState);
  return { ok: true };
}

/** An auction by order of the court may be called at any time, even with an empty table. */
export function canCallAuction(gameState: RazziaGameState) {
  return gameState.public.roundState === "ACTION";
}

export function initiateAuction(gameState: RazziaGameState): ActionResult {
  if (!canCallAuction(gameState)) return fail("Not in the action phase.");
  const actor = gameState.public.activePlayer;
  gameState.public.roundState = "NORMAL_AUCTION";
  gameState.public.auctionTriggeringPlayer = actor;
  gameState.public.discardIfUnsold = false;
  announce(gameState, `${actor} called an auction.`);
  updateActivePlayer(gameState);
  return { ok: true };
}

export function canUseThief(gameState: RazziaGameState, player: RazziaPlayerState) {
  return (
    gameState.public.roundState === "ACTION" &&
    (player.cards?.theives || []).length > 0 &&
    (gameState.public.revealedCards || []).length > 0
  );
}

/** Spends one thief per booty card taken straight from the table (any card, thieves included). */
export function useThief(
  gameState: RazziaGameState,
  cardsToSteal: LootCards[]
): ActionResult {
  const player = getActivePlayer(gameState);
  if (!player) return fail("Active player not found.");
  if (gameState.public.roundState !== "ACTION") return fail("Not in the action phase.");
  if (cardsToSteal.length === 0) return fail("Choose at least one card.");
  const thieves = player.cards?.theives || [];
  if (thieves.length < cardsToSteal.length) {
    return fail("Not enough thief cards.");
  }
  const table = [...(gameState.public.revealedCards || [])];
  for (const card of cardsToSteal) {
    const index = table.indexOf(card);
    if (index === -1) return fail(`${card} is not on the table.`);
    table.splice(index, 1);
  }

  player.cards.theives = thieves.slice(0, thieves.length - cardsToSteal.length);
  for (const card of cardsToSteal) addCardToPlayer(player, card);
  gameState.public.revealedCards = table;

  announce(gameState, `${player.email} used a thief to take ${cardsToSteal.join(", ")}.`);
  updateActivePlayer(gameState);
  return { ok: true };
}

/** Awards the table and the centre money to the highest bidder, then moves on. */
function resolveAuction(gameState: RazziaGameState) {
  const winner = getPlayerWithHighestBid(gameState);
  const caller = gameState.public.auctionTriggeringPlayer || gameState.public.activePlayer;

  if (!winner) {
    if (gameState.public.discardIfUnsold) {
      gameState.public.revealedCards = [];
      announce(gameState, "Nobody bid. The seven cards are discarded.");
    } else if (gameState.public.roundState === "FORCED_AUCTION") {
      announce(gameState, "Nobody bid. The loot stays on the table.");
    } else {
      announce(gameState, "Nobody bid.");
    }
    gameState.public.roundState = "ACTION";
  } else {
    const bid = winner.bid;
    const centre = gameState.public.money;
    winner.availableMoney = (winner.availableMoney || []).filter((m) => m !== bid);
    winner.money = [...(winner.money || []).filter((m) => m !== bid), centre];
    gameState.public.money = bid;

    const loot = gameState.public.revealedCards || [];
    for (const card of loot) addCardToPlayer(winner, card);
    gameState.public.revealedCards = [];

    announce(
      gameState,
      `${winner.email} won the auction with ${bid}.`,
      `They take ${loot.length} card${loot.length === 1 ? "" : "s"} and the ${centre} money card.`
    );
    gameState.public.roundState = "ACTION";
  }

  for (const player of gameState.public.players) player.bid = "0";
  gameState.public.auctionTriggeringPlayer = undefined;
  gameState.public.discardIfUnsold = false;

  if (!anyoneHasMoney(gameState)) {
    announce(gameState, "Everyone has spent their money.", "The round ends.");
    endRound(gameState);
    return;
  }

  // Play continues with the player after whoever started the auction.
  gameState.public.activePlayer = caller;
  updateActivePlayer(gameState);
}

export function bid(gameState: RazziaGameState, amount: string): ActionResult {
  const player = getActivePlayer(gameState);
  if (!player) return fail("Active player not found.");
  if (!isAuction(gameState)) return fail("No auction is running.");
  if (!biddableMoney(gameState, player).includes(amount)) {
    return fail(`${amount} is not a money card you can bid now.`);
  }
  player.bid = amount;
  announce(gameState, `${player.email} bid ${amount}.`);

  if (player.email === gameState.public.auctionTriggeringPlayer) {
    resolveAuction(gameState);
  } else {
    updateActivePlayer(gameState);
  }
  return { ok: true };
}

export function pass(gameState: RazziaGameState): ActionResult {
  const player = getActivePlayer(gameState);
  if (!player) return fail("Active player not found.");
  if (!isAuction(gameState)) return fail("No auction is running.");
  if (!canPass(gameState, player)) {
    return fail("You called this auction, so you must bid.");
  }
  announce(gameState, `${player.email} passed.`);

  if (player.email === gameState.public.auctionTriggeringPlayer) {
    resolveAuction(gameState);
  } else {
    updateActivePlayer(gameState);
  }
  return { ok: true };
}
