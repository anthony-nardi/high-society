import { ForSaleGameState, ForSalePlayerState, Sale } from "../types";
import { LogEntry, Notification, PlayerInLobby } from "../../shared/types";
import type { ActionResult } from "../../shared/game";

/*
 * Pure rules for For Sale: everything here mutates the state it is given
 * and never touches the database. Money is in thousands.
 */

export const PROPERTY_COUNT = 30;
/** Two of each: $0 and $2,000 to $15,000. */
export const CHEQUE_VALUES: number[] = [0, 0].concat(
  ...Array.from({ length: 14 }, (_, i) => [i + 2, i + 2]),
);

export const startingMoney = (players: number) => (players <= 4 ? 18 : 14);
export const cardsRemoved = (players: number) =>
  players === 3 ? 6 : players === 4 ? 2 : 0;

export const money = (thousands: number) =>
  `$${(thousands * 1000).toLocaleString("en-US")}`;

export function appendLog(gameState: ForSaleGameState, entry: LogEntry) {
  gameState.private.log = [...(gameState.private.log || []), entry];
}

export function publishLog(gameState: ForSaleGameState) {
  gameState.public.log = gameState.private.log || [];
}

function announce(
  gameState: ForSaleGameState,
  title: string,
  message?: string,
) {
  const notification: Notification = { timestamp: Date.now(), title };
  if (message) notification.message = message;
  gameState.public.notification = notification;
  appendLog(gameState, notification);
}

export function playerByEmail(
  gameState: ForSaleGameState,
  email: string | undefined,
) {
  return gameState.public.players.find((p) => p.email === email);
}

export function getActivePlayer(gameState: ForSaleGameState) {
  return playerByEmail(gameState, gameState.public.activePlayer);
}

export function isGameOver(gameState: ForSaleGameState) {
  return gameState.public.status === "GAME_OVER";
}

function shuffled<T>(items: T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function buildForSaleGameState(
  lobbyUID: string,
  players: PlayerInLobby[],
  random: () => number = Math.random,
): ForSaleGameState {
  const seats = players.slice(0, 6);
  const remove = cardsRemoved(seats.length);
  const playersMetadata: ForSalePlayerState[] = seats.map((player) => ({
    email: player.email,
    lastActionAt: 0,
    money: startingMoney(seats.length),
    bid: 0,
    isBot: !!player.isBot,
  }));
  const starter = playersMetadata[Math.floor(random() * seats.length)];
  const propertyDeck = shuffled(
    Array.from({ length: PROPERTY_COUNT }, (_, i) => i + 1),
    random,
  ).slice(remove);
  const chequeDeck = shuffled(CHEQUE_VALUES, random).slice(remove);

  const state: ForSaleGameState = {
    public: {
      id: lobbyUID,
      game: "for-sale",
      players: playersMetadata,
      activePlayer: starter.email,
      startAt: Date.now().toString(),
      status: "IN_PROGRESS",
      phase: "BUYING",
      round: 0,
      highBid: 0,
      starting: starter.email,
      propertiesLeft: propertyDeck.length,
      chequesLeft: chequeDeck.length,
    },
    private: {
      propertyDeck,
      chequeDeck,
      log: [
        {
          timestamp: Date.now(),
          title: `Game started with ${money(startingMoney(seats.length))} each. ${starter.email} opens the bidding.`,
        },
      ],
    },
  };
  dealProperties(state, starter);
  return state;
}

// ---------------------------------------------------------------------------
// Rounds
// ---------------------------------------------------------------------------

function dealProperties(
  gameState: ForSaleGameState,
  starter: ForSalePlayerState,
) {
  const n = gameState.public.players.length;
  const propertyDeck = gameState.private.propertyDeck || [];
  const onOffer = propertyDeck.splice(0, n).sort((a, b) => a - b);
  gameState.public.onOffer = onOffer;
  gameState.private.propertyDeck = propertyDeck;
  gameState.public.propertiesLeft = propertyDeck.length;
  gameState.public.round += 1;
  gameState.public.highBid = 0;
  delete gameState.public.highBidder;
  gameState.public.starting = starter.email;
  gameState.public.activePlayer = starter.email;
  for (const p of gameState.public.players) {
    p.bid = 0;
    delete p.passed;
  }
  appendLog(gameState, {
    timestamp: Date.now(),
    title: `Round ${gameState.public.round}: properties ${onOffer.map((p) => `#${p}`).join(", ")} are up for auction.`,
  });
}

/** Bots choose first so the table never waits on one; then any human still to choose. */
function nextChooser(gameState: ForSaleGameState) {
  const chosen = new Set(gameState.public.chosen || []);
  const waiting = gameState.public.players.filter((p) => !chosen.has(p.email));
  return waiting.find((p) => p.isBot) ?? waiting[0];
}

function dealCheques(gameState: ForSaleGameState) {
  const n = gameState.public.players.length;
  const chequeDeck = gameState.private.chequeDeck || [];
  const cheques = chequeDeck.splice(0, n).sort((a, b) => a - b);
  gameState.public.cheques = cheques;
  gameState.private.chequeDeck = chequeDeck;
  gameState.public.chequesLeft = chequeDeck.length;
  gameState.public.round += 1;
  delete gameState.public.chosen;
  delete gameState.private.choices;
  const chooser = nextChooser(gameState);
  if (chooser) gameState.public.activePlayer = chooser.email;
  appendLog(gameState, {
    timestamp: Date.now(),
    title: `Round ${gameState.public.round}: cheques ${cheques.map((c) => money(c)).join(", ")} are on offer.`,
  });
}

function startSelling(gameState: ForSaleGameState) {
  gameState.public.phase = "SELLING";
  gameState.public.round = 0;
  delete gameState.public.onOffer;
  announce(
    gameState,
    "Every property is sold. Now the cheques: choose a property to sell each round.",
  );
  dealCheques(gameState);
}

export function totalOf(player: ForSalePlayerState) {
  return player.money + (player.cheques || []).reduce((s, c) => s + c, 0);
}

function finish(gameState: ForSaleGameState) {
  gameState.public.status = "GAME_OVER";
  delete gameState.public.cheques;
  const ranked = [...gameState.public.players].sort(
    (a, b) => totalOf(b) - totalOf(a) || b.money - a.money,
  );
  const best = ranked[0];
  const ties = ranked.filter(
    (p) => totalOf(p) === totalOf(best) && p.money === best.money,
  );
  if (ties.length === 1) gameState.public.winner = best.email;
  announce(
    gameState,
    ties.length === 1
      ? `${best.email} wins!`
      : `${ties.map((p) => p.email).join(" and ")} share the win.`,
    `Game over. ${best.email} finishes with ${money(totalOf(best))}.`,
  );
  publishLog(gameState);
}

// ---------------------------------------------------------------------------
// Buying
// ---------------------------------------------------------------------------

const fail = (reason: string): ActionResult => ({ ok: false, reason });

function stillIn(gameState: ForSaleGameState) {
  return gameState.public.players.filter((p) => !p.passed);
}

function advanceBidder(gameState: ForSaleGameState) {
  const players = gameState.public.players;
  let i = players.findIndex((p) => p.email === gameState.public.activePlayer);
  for (let step = 0; step < players.length; step++) {
    i = (i + 1) % players.length;
    if (!players[i].passed) {
      gameState.public.activePlayer = players[i].email;
      return;
    }
  }
}

/** Raise the bid to `amount` thousand, more than the standing bid and no more than you have. */
export function bid(gameState: ForSaleGameState, amount: number): ActionResult {
  if (isGameOver(gameState)) return fail("The game is over.");
  if (gameState.public.phase !== "BUYING")
    return fail("The auctions are over.");
  const player = getActivePlayer(gameState);
  if (!player) return fail("Active player not found.");
  if (player.passed) return fail("You have passed this auction.");
  if (!Number.isInteger(amount) || amount <= 0)
    return fail("Bid a whole number of thousands.");
  if (amount <= gameState.public.highBid)
    return fail(`Bid more than ${money(gameState.public.highBid)}.`);
  if (amount > player.money)
    return fail(`You only have ${money(player.money)}.`);

  player.bid = amount;
  player.lastActionAt = Date.now();
  gameState.public.highBid = amount;
  gameState.public.highBidder = player.email;
  gameState.public.lastMove = { type: "bid", email: player.email, amount };
  announce(gameState, `${player.email} bids ${money(amount)}.`);
  advanceBidder(gameState);
  return { ok: true };
}

function giveProperty(
  gameState: ForSaleGameState,
  player: ForSalePlayerState,
  property: number,
  paid: number,
) {
  player.properties = [...(player.properties || []), property].sort(
    (a, b) => a - b,
  );
  player.money -= paid;
  player.passed = true;
  player.lastActionAt = Date.now();
}

/** Drop out: take the cheapest property left and pay half your bid, rounded up. */
export function pass(gameState: ForSaleGameState): ActionResult {
  if (isGameOver(gameState)) return fail("The game is over.");
  if (gameState.public.phase !== "BUYING")
    return fail("The auctions are over.");
  const player = getActivePlayer(gameState);
  if (!player) return fail("Active player not found.");
  if (player.passed) return fail("You have passed this auction.");
  const onOffer = gameState.public.onOffer || [];
  if (!onOffer.length) return fail("Nothing is on offer.");

  const property = onOffer[0];
  const paid = Math.ceil(player.bid / 2);
  gameState.public.onOffer = onOffer.slice(1);
  giveProperty(gameState, player, property, paid);
  gameState.public.lastMove = {
    type: "pass",
    email: player.email,
    property,
    amount: paid,
  };
  announce(
    gameState,
    `${player.email} passes and takes #${property}${paid ? ` for ${money(paid)}` : ""}.`,
  );

  const remaining = stillIn(gameState);
  if (remaining.length === 1) {
    const winner = remaining[0];
    const last = gameState.public.onOffer[0];
    gameState.public.onOffer = [];
    giveProperty(gameState, winner, last, winner.bid);
    gameState.public.lastMove = {
      type: "buy",
      email: winner.email,
      property: last,
      amount: winner.bid,
    };
    announce(
      gameState,
      `${winner.email} wins #${last}${winner.bid ? ` for ${money(winner.bid)}` : " for nothing"}.`,
    );
    if ((gameState.private.propertyDeck || []).length === 0)
      startSelling(gameState);
    else dealProperties(gameState, winner);
    return { ok: true };
  }
  advanceBidder(gameState);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Selling
// ---------------------------------------------------------------------------

/** Put one of your properties face down for this round's cheques. */
export function sell(
  gameState: ForSaleGameState,
  email: string,
  property: number,
): ActionResult {
  if (isGameOver(gameState)) return fail("The game is over.");
  if (gameState.public.phase !== "SELLING")
    return fail("The auctions are not over yet.");
  const player = playerByEmail(gameState, email);
  if (!player) return fail("Player not found.");
  if ((gameState.public.chosen || []).includes(email))
    return fail("You have already chosen this round.");
  if (!(player.properties || []).includes(property))
    return fail("That is not one of your properties.");

  gameState.private.choices = {
    ...(gameState.private.choices || {}),
    [email]: property,
  };
  gameState.public.chosen = [...(gameState.public.chosen || []), email];
  player.lastActionAt = Date.now();
  appendLog(gameState, {
    timestamp: Date.now(),
    title: `${email} has chosen a property to sell.`,
  });

  if (gameState.public.chosen.length === gameState.public.players.length) {
    resolveSales(gameState);
    return { ok: true };
  }
  const chooser = nextChooser(gameState);
  if (chooser) gameState.public.activePlayer = chooser.email;
  gameState.public.notification = {
    timestamp: Date.now(),
    title: `${email} has chosen. Waiting for ${gameState.public.players.length - gameState.public.chosen.length} more.`,
  };
  return { ok: true };
}

function resolveSales(gameState: ForSaleGameState) {
  const choices = gameState.private.choices || {};
  const cheques = [...(gameState.public.cheques || [])].sort((a, b) => b - a);
  const order = Object.entries(choices).sort(([, a], [, b]) => b - a);
  const sales: Sale[] = order.map(([email, property], i) => ({
    email,
    property,
    cheque: cheques[i],
  }));
  for (const sale of sales) {
    const player = playerByEmail(gameState, sale.email) as ForSalePlayerState;
    player.properties = (player.properties || []).filter(
      (p) => p !== sale.property,
    );
    player.cheques = [...(player.cheques || []), sale.cheque];
  }
  gameState.public.lastSale = sales;
  gameState.public.lastMove = { type: "sale" };
  announce(
    gameState,
    `Sold: ${sales.map((s) => `${s.email} #${s.property} for ${money(s.cheque)}`).join("; ")}.`,
  );
  if ((gameState.private.chequeDeck || []).length === 0) finish(gameState);
  else dealCheques(gameState);
}
