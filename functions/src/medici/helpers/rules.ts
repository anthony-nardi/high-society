import {
  Card,
  Commodity,
  DayScoring,
  MediciGameState,
  MediciPlayerState,
  ShipResult,
  TrackResult,
} from "../types";
import { LogEntry, Notification, PlayerInLobby } from "../../shared/types";
import type { ActionResult } from "../../shared/game";
import {
  bonusFor,
  capacityFor,
  cardsPerDay,
  COMMODITIES,
  countOf,
  DAYS,
  fullDeck,
  lotLabel,
  MAX_LOT,
  shipPayouts,
  shipValue,
  startingFlorins,
  TOP_LEVEL,
  trackPayouts,
} from "./board";

/*
 * Pure rules for Medici, after the 2023 Steamforged rulebook. Three days;
 * each turn the holder of the first player card turns over one to three
 * cards as a lot, everyone bids once in turn with the auctioneer last, and
 * the buyer loads the lot. A day ends when all but one ship is full (the
 * last fills for nothing) or the deck runs out; then the ships' values and
 * the commodity tracks pay out, and the poorest player opens the next day.
 */

export function appendLog(gameState: MediciGameState, entry: LogEntry) {
  gameState.private.log = [...(gameState.private.log || []), entry];
}

export function publishLog(gameState: MediciGameState) {
  gameState.public.log = gameState.private.log || [];
}

function announce(gameState: MediciGameState, title: string, message?: string) {
  const notification: Notification = { timestamp: Date.now(), title };
  if (message) notification.message = message;
  gameState.public.notification = notification;
  appendLog(gameState, notification);
}

const fail = (reason: string): ActionResult => ({ ok: false, reason });
const ok: ActionResult = { ok: true };

export function playerByEmail(
  gameState: MediciGameState,
  email: string | undefined,
) {
  return gameState.public.players.find((p) => p.email === email);
}

export function getActivePlayer(gameState: MediciGameState) {
  return playerByEmail(gameState, gameState.public.activePlayer);
}

export function isGameOver(gameState: MediciGameState) {
  return gameState.public.status === "GAME_OVER";
}

export function freeSpace(
  gameState: MediciGameState,
  player: MediciPlayerState,
) {
  return gameState.public.capacity - (player.ship || []).length;
}

export function isFull(gameState: MediciGameState, player: MediciPlayerState) {
  return freeSpace(gameState, player) <= 0;
}

/** The biggest lot anyone could still load. */
export function maxFit(gameState: MediciGameState) {
  return Math.max(
    0,
    ...gameState.public.players.map((p) => freeSpace(gameState, p)),
  );
}

/** Whether the auctioneer may turn over another card. */
export function mayDraw(gameState: MediciGameState) {
  const lot = gameState.public.lot || [];
  return (
    gameState.public.phase === "DRAW" &&
    lot.length < MAX_LOT &&
    lot.length < maxFit(gameState) &&
    (gameState.private.deck || []).length > 0
  );
}

/** Whether a player could bid anything at all on the lot as it stands. */
export function canBid(gameState: MediciGameState, player: MediciPlayerState) {
  const lot = gameState.public.lot || [];
  return (
    lot.length > 0 &&
    lot.length <= freeSpace(gameState, player) &&
    player.money > (gameState.public.highBid || 0)
  );
}

function shuffled<T>(items: T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const emptyTracks = (): { [c in Commodity]: number } => ({
  CLOTH: 0,
  SPICE: 0,
  GRAIN: 0,
  DYE: 0,
  FUR: 0,
});

export function buildMediciGameState(
  lobbyUID: string,
  players: PlayerInLobby[],
  random: () => number = Math.random,
): MediciGameState {
  const seats = players.slice(0, 6);
  const florins = startingFlorins(seats.length);
  const playersMetadata: MediciPlayerState[] = seats.map((player) => ({
    email: player.email,
    lastActionAt: 0,
    isBot: !!player.isBot,
    money: florins,
    tracks: emptyTracks(),
  }));
  const starter = playersMetadata[Math.floor(random() * seats.length)];

  const gameState: MediciGameState = {
    public: {
      id: lobbyUID,
      game: "medici",
      players: playersMetadata,
      activePlayer: starter.email,
      startAt: Date.now().toString(),
      status: "IN_PROGRESS",
      day: 1,
      phase: "DRAW",
      auctioneer: starter.email,
      deckCount: 0,
      capacity: capacityFor(seats.length),
      turn: 0,
    },
    private: {
      log: [
        {
          timestamp: Date.now(),
          title: `Game started with ${florins} florins each and holds of ${capacityFor(seats.length)}. ${starter.email} holds the first player card.`,
        },
      ],
    },
  };
  startDay(gameState, 1, starter.email, random);
  return gameState;
}

/** Shuffles all 36 cards and deals the day's deck; the ships sail empty. */
function startDay(
  gameState: MediciGameState,
  day: number,
  auctioneer: string,
  random: () => number,
) {
  const pub = gameState.public;
  const deck = shuffled(fullDeck(), random);
  const used = deck.splice(0, cardsPerDay(pub.players.length));
  gameState.private.deck = used;
  if (deck.length) gameState.private.removed = deck;
  else delete gameState.private.removed;
  delete gameState.private.discard;
  pub.deckCount = used.length;
  pub.day = day;
  pub.phase = "DRAW";
  pub.auctioneer = auctioneer;
  pub.activePlayer = auctioneer;
  delete pub.lot;
  delete pub.highBid;
  delete pub.highBidder;
  for (const p of pub.players) {
    delete p.ship;
    delete p.bid;
    delete p.passed;
  }
}

// ---------------------------------------------------------------------------
// Making up the lot
// ---------------------------------------------------------------------------

/** The auctioneer turns the top card over onto the lot. */
export function drawCard(gameState: MediciGameState): ActionResult {
  if (isGameOver(gameState)) return fail("The game is over.");
  const pub = gameState.public;
  if (pub.phase !== "DRAW") return fail("The lot is already being auctioned.");
  const player = getActivePlayer(gameState);
  if (!player) return fail("Active player not found.");
  const lot = pub.lot || [];
  if (lot.length >= MAX_LOT) return fail("A lot holds at most three cards.");
  if (lot.length >= maxFit(gameState))
    return fail("No hold could take a bigger lot.");
  const deck = gameState.private.deck || [];
  if (!deck.length) return fail("The deck is empty.");

  pub.auctioneer = player.email;
  const card = deck.shift() as Card;
  if (deck.length) gameState.private.deck = deck;
  else delete gameState.private.deck;
  pub.deckCount = deck.length;
  pub.lot = [...lot, card];
  player.lastActionAt = Date.now();
  announce(gameState, `${player.email} turns over ${lotLabel([card])}.`);

  if (!mayDraw(gameState)) beginBidding(gameState);
  return ok;
}

/** The auctioneer stops drawing and puts the lot up. */
export function offerLot(gameState: MediciGameState): ActionResult {
  if (isGameOver(gameState)) return fail("The game is over.");
  const pub = gameState.public;
  if (pub.phase !== "DRAW") return fail("The lot is already being auctioned.");
  const player = getActivePlayer(gameState);
  if (!player) return fail("Active player not found.");
  const lot = pub.lot || [];
  if (!lot.length) return fail("Turn over a card first.");
  pub.auctioneer = player.email;
  player.lastActionAt = Date.now();
  announce(gameState, `${player.email} offers the lot: ${lotLabel(lot)}.`);
  beginBidding(gameState);
  return ok;
}

/** Bidding starts on the auctioneer's left and ends with the auctioneer. */
function beginBidding(gameState: MediciGameState) {
  const pub = gameState.public;
  pub.phase = "BID";
  delete pub.highBid;
  delete pub.highBidder;
  for (const p of pub.players) {
    delete p.bid;
    delete p.passed;
  }
  pub.activePlayer = pub.auctioneer;
  advanceBidder(gameState);
}

/** Order of bidders after the active one, up to and including the auctioneer. */
function biddersAfter(gameState: MediciGameState) {
  const pub = gameState.public;
  const players = pub.players;
  const start = players.findIndex((p) => p.email === pub.activePlayer);
  const end = players.findIndex((p) => p.email === pub.auctioneer);
  const out: MediciPlayerState[] = [];
  if (
    pub.activePlayer === pub.auctioneer &&
    pub.players.every((p) => p.bid === undefined && !p.passed)
  ) {
    // Bidding is only starting: everyone else, then the auctioneer.
    for (let k = 1; k <= players.length; k++)
      out.push(players[(start + k) % players.length]);
    return out;
  }
  if (pub.activePlayer === pub.auctioneer) return out;
  for (let k = 1; k <= players.length; k++) {
    const p = players[(start + k) % players.length];
    out.push(p);
    if ((start + k) % players.length === end) break;
  }
  return out;
}

/** Hands the turn to the next player who could bid; those who cannot pass by rule. */
function advanceBidder(gameState: MediciGameState) {
  const pub = gameState.public;
  for (const p of biddersAfter(gameState)) {
    if (canBid(gameState, p)) {
      pub.activePlayer = p.email;
      return;
    }
    p.passed = true;
  }
  resolveAuction(gameState);
}

// ---------------------------------------------------------------------------
// Bidding
// ---------------------------------------------------------------------------

export function bid(gameState: MediciGameState, amount: number): ActionResult {
  if (isGameOver(gameState)) return fail("The game is over.");
  const pub = gameState.public;
  if (pub.phase !== "BID") return fail("Nothing is up for auction.");
  const player = getActivePlayer(gameState);
  if (!player) return fail("Active player not found.");
  if (player.passed || player.bid !== undefined)
    return fail("You have had your one chance to bid.");
  const lot = pub.lot || [];
  if (lot.length > freeSpace(gameState, player))
    return fail("That lot would not fit in your hold.");
  if (!Number.isInteger(amount) || amount < 1)
    return fail("Bid at least 1 florin.");
  if (amount <= (pub.highBid || 0))
    return fail(`Bid more than ${pub.highBid} florins.`);
  if (amount > player.money)
    return fail(`You only have ${player.money} florins.`);

  player.bid = amount;
  player.lastActionAt = Date.now();
  pub.highBid = amount;
  pub.highBidder = player.email;
  announce(gameState, `${player.email} bids ${amount} florins.`);
  afterBid(gameState, player);
  return ok;
}

export function pass(gameState: MediciGameState): ActionResult {
  if (isGameOver(gameState)) return fail("The game is over.");
  const pub = gameState.public;
  if (pub.phase !== "BID") return fail("Nothing is up for auction.");
  const player = getActivePlayer(gameState);
  if (!player) return fail("Active player not found.");
  if (player.passed || player.bid !== undefined)
    return fail("You have had your one chance to bid.");
  player.passed = true;
  player.lastActionAt = Date.now();
  announce(gameState, `${player.email} passes.`);
  afterBid(gameState, player);
  return ok;
}

function afterBid(gameState: MediciGameState, player: MediciPlayerState) {
  if (player.email === gameState.public.auctioneer) resolveAuction(gameState);
  else advanceBidder(gameState);
}

// ---------------------------------------------------------------------------
// Resolving
// ---------------------------------------------------------------------------

function resolveAuction(gameState: MediciGameState) {
  const pub = gameState.public;
  const lot = pub.lot || [];
  const buyer = playerByEmail(gameState, pub.highBidder);
  const last = {
    turn: pub.turn,
    auctioneer: pub.auctioneer,
    lot,
  };
  if (buyer && pub.highBid) {
    buyer.money -= pub.highBid;
    buyer.ship = [...(buyer.ship || []), ...lot];
    pub.lastAuction = { ...last, email: buyer.email, amount: pub.highBid };
    announce(
      gameState,
      `${buyer.email} wins the lot for ${pub.highBid} florins: ${lotLabel(lot)}.`,
    );
  } else {
    gameState.private.discard = [...(gameState.private.discard || []), ...lot];
    pub.lastAuction = last;
    announce(gameState, `Nobody bids: ${lotLabel(lot)} discarded.`);
  }
  delete pub.lot;
  delete pub.highBid;
  delete pub.highBidder;
  for (const p of pub.players) {
    delete p.bid;
    delete p.passed;
  }
  pub.turn += 1;
  afterAuction(gameState);
}

function afterAuction(gameState: MediciGameState) {
  const pub = gameState.public;
  const afloat = pub.players.filter((p) => !isFull(gameState, p));
  const deck = gameState.private.deck || [];
  if (afloat.length <= 1) {
    let freeFill: DayScoring["freeFill"];
    if (afloat.length === 1 && deck.length) {
      const last = afloat[0];
      const cards = deck.splice(0, freeSpace(gameState, last));
      if (deck.length) gameState.private.deck = deck;
      else delete gameState.private.deck;
      pub.deckCount = deck.length;
      last.ship = [...(last.ship || []), ...cards];
      freeFill = { email: last.email, cards };
      appendLog(gameState, {
        timestamp: Date.now(),
        title: `${last.email} fills the hold for nothing: ${lotLabel(cards)}.`,
      });
    }
    scoreDay(gameState, freeFill);
    return;
  }
  if (!deck.length) {
    scoreDay(gameState);
    return;
  }
  // The first player card passes to the next player still afloat.
  const players = pub.players;
  let i = players.findIndex((p) => p.email === pub.auctioneer);
  for (let k = 0; k < players.length; k++) {
    i = (i + 1) % players.length;
    if (!isFull(gameState, players[i])) break;
  }
  pub.auctioneer = players[i].email;
  pub.activePlayer = players[i].email;
  pub.phase = "DRAW";
}

// ---------------------------------------------------------------------------
// Scoring the day
// ---------------------------------------------------------------------------

/** The levels after the day's purchases are counted, without changing anything. */
export function levelsAfter(
  players: MediciPlayerState[],
  commodity: Commodity,
) {
  return players.map((p) => ({
    email: p.email,
    level: Math.min(
      TOP_LEVEL,
      p.tracks[commodity] + countOf(p.ship || [], commodity),
    ),
  }));
}

/** Works out the day's payouts for the ships as they stand. Pure. */
export function computeDayScoring(
  gameState: MediciGameState,
  freeFill?: DayScoring["freeFill"],
): DayScoring {
  const pub = gameState.public;
  const ships = pub.players.map((p) => ({
    email: p.email,
    value: shipValue(p.ship || []),
  }));
  const pay = shipPayouts(ships);
  const shipRows: ShipResult[] = ships
    .map((s) => {
      const row: ShipResult = {
        email: s.email,
        value: s.value,
        pay: pay[s.email],
      };
      const cards = playerByEmail(gameState, s.email)?.ship || [];
      if (cards.length) row.cards = cards;
      return row;
    })
    .sort((a, b) => b.value - a.value);
  const tracks = COMMODITIES.map((commodity) => {
    const levels = levelsAfter(pub.players, commodity);
    const awards = trackPayouts(levels);
    const rows: TrackResult[] = levels.map((l) => ({
      email: l.email,
      level: l.level,
      award: awards[l.email],
      bonus: bonusFor(l.level),
    }));
    return { commodity, rows };
  });
  const totals = pub.players.map((p) => {
    const gained =
      pay[p.email] +
      tracks.reduce((s, t) => {
        const row = t.rows.find((r) => r.email === p.email);
        return s + (row ? row.award + row.bonus : 0);
      }, 0);
    return { email: p.email, before: p.money, after: p.money + gained };
  });
  const scoring: DayScoring = {
    day: pub.day,
    turn: pub.turn,
    ships: shipRows,
    tracks,
    totals,
  };
  if (freeFill) scoring.freeFill = freeFill;
  return scoring;
}

function scoreDay(
  gameState: MediciGameState,
  freeFill?: DayScoring["freeFill"],
  random: () => number = Math.random,
) {
  const pub = gameState.public;
  const scoring = computeDayScoring(gameState, freeFill);
  for (const p of pub.players) {
    for (const t of scoring.tracks) {
      const row = t.rows.find((r) => r.email === p.email);
      if (row) p.tracks[t.commodity] = row.level;
    }
    const total = scoring.totals.find((t) => t.email === p.email);
    if (total) p.money = total.after;
  }
  pub.dayScoring = scoring;
  const ships = scoring.ships
    .map((s) => `${s.email} ${s.value} (+${s.pay})`)
    .join(", ");
  const tracks = scoring.totals
    .map((t) => {
      const ship = scoring.ships.find((s) => s.email === t.email)?.pay || 0;
      return `${t.email} +${t.after - t.before - ship}`;
    })
    .join(", ");
  announce(
    gameState,
    `Day ${pub.day} is scored.`,
    `Ships: ${ships}. Tracks: ${tracks}.`,
  );

  if (pub.day >= DAYS) {
    finish(gameState);
    return;
  }
  const least = Math.min(...pub.players.map((p) => p.money));
  const poorest = pub.players.filter((p) => p.money === least);
  const opener = poorest[Math.floor(random() * poorest.length)];
  startDay(gameState, pub.day + 1, opener.email, random);
  appendLog(gameState, {
    timestamp: Date.now(),
    title: `Day ${pub.day} begins. ${opener.email} holds the first player card.`,
  });
}

function finish(gameState: MediciGameState) {
  const pub = gameState.public;
  pub.status = "GAME_OVER";
  const best = Math.max(...pub.players.map((p) => p.money));
  const winners = pub.players.filter((p) => p.money === best);
  pub.winners = winners.map((w) => w.email);
  if (winners.length === 1) pub.winner = winners[0].email;
  announce(
    gameState,
    winners.length === 1
      ? `Game over: ${winners[0].email} wins with ${best} florins.`
      : `Game over: ${winners.map((w) => w.email).join(" and ")} share the win with ${best} florins.`,
  );
  publishLog(gameState);
}
