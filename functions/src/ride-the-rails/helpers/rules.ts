import {
  Journey,
  Railroad,
  RideResult,
  RideTheRailsGameState,
  RideTheRailsPlayerState,
} from "../types";
import { LogEntry, Notification, PlayerInLobby } from "../../shared/types";
import type { ActionResult } from "../../shared/game";
import {
  buildLimit,
  CHICAGO,
  CHICAGO_BONUS,
  CITIES,
  CITY_BONUS,
  cityName,
  colOf,
  EAST_CITIES,
  HEX_CAPACITY,
  isChicago,
  isCity,
  isHex,
  isLand,
  isMountain,
  kindOf,
  label,
  LOCOMOTIVES_PER_RAILROAD,
  neighbours,
  RAILROADS,
  railroadsOpen,
  ROUNDS,
  rowOf,
  TRANSCONTINENTAL_BONUS,
  TRANSCONTINENTAL_CITY_BONUS,
  WEST_CITIES,
} from "./board";

/*
 * Pure rules for Ride the Rails: everything here mutates the state it is
 * given and never touches the database.
 */

export const money = (n: number) => `$${n}`;

export function appendLog(gameState: RideTheRailsGameState, entry: LogEntry) {
  gameState.private.log = [...(gameState.private.log || []), entry];
}

export function publishLog(gameState: RideTheRailsGameState) {
  gameState.public.log = gameState.private.log || [];
}

function announce(
  gameState: RideTheRailsGameState,
  title: string,
  message?: string,
) {
  const notification: Notification = { timestamp: Date.now(), title };
  if (message) notification.message = message;
  gameState.public.notification = notification;
  appendLog(gameState, notification);
}

export function playerByEmail(
  gameState: RideTheRailsGameState,
  email: string | undefined,
) {
  return gameState.public.players.find((p) => p.email === email);
}

export function getActivePlayer(gameState: RideTheRailsGameState) {
  return playerByEmail(gameState, gameState.public.activePlayer);
}

export function isGameOver(gameState: RideTheRailsGameState) {
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

export function buildRideTheRailsGameState(
  lobbyUID: string,
  players: PlayerInLobby[],
  random: () => number = Math.random,
): RideTheRailsGameState {
  const seats = players.slice(0, 5);
  const playersMetadata: RideTheRailsPlayerState[] = seats.map((player) => ({
    email: player.email,
    lastActionAt: 0,
    money: 0,
    isBot: !!player.isBot,
  }));
  const order = shuffled(
    playersMetadata.map((p) => p.email),
    random,
  );
  const supply = Object.fromEntries(
    RAILROADS.map((r) => [r, LOCOMOTIVES_PER_RAILROAD]),
  ) as { [railroad in Railroad]: number };

  return {
    public: {
      id: lobbyUID,
      game: "ride-the-rails",
      players: playersMetadata,
      activePlayer: order[order.length - 1],
      startAt: Date.now().toString(),
      status: "IN_PROGRESS",
      phase: "SHARE",
      round: 1,
      order,
      seat: order.length - 1,
      supply,
      passengers: [...CITIES],
      built: 0,
      mountainBuilt: false,
      turn: 1,
    },
    private: {
      log: [
        {
          timestamp: Date.now(),
          title: `Game started. Turn order: ${order.join(", ")}. Red and Blue are open; shares go in reverse order, so ${order[order.length - 1]} chooses first.`,
        },
      ],
    },
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const trackOf = (
  gameState: RideTheRailsGameState,
  railroad: Railroad,
): number[] => gameState.public.track?.[railroad] || [];

export const sharesOf = (player: RideTheRailsPlayerState, railroad: Railroad) =>
  player.shares?.[railroad] ?? 0;

export const totalShares = (player: RideTheRailsPlayerState) =>
  RAILROADS.reduce((n, r) => n + sharesOf(player, r), 0);

export const openRailroads = (gameState: RideTheRailsGameState) =>
  railroadsOpen(gameState.public.round);

export const hasPassenger = (gameState: RideTheRailsGameState, hex: number) =>
  (gameState.public.passengers || []).includes(hex);

/** Railroads with a locomotive in the hex. */
export function railroadsIn(
  gameState: RideTheRailsGameState,
  hex: number,
): Railroad[] {
  return RAILROADS.filter((r) => trackOf(gameState, r).includes(hex));
}

export const occupancy = (gameState: RideTheRailsGameState, hex: number) =>
  railroadsIn(gameState, hex).length;

export const hasRoom = (gameState: RideTheRailsGameState, hex: number) =>
  isChicago(hex) || occupancy(gameState, hex) < HEX_CAPACITY;

/** Cities with any track, west to east. */
export function occupiedCities(gameState: RideTheRailsGameState) {
  return CITIES.filter((c) => occupancy(gameState, c) > 0).sort(
    (a, b) => colOf(a) - colOf(b) || rowOf(a) - rowOf(b),
  );
}

/** Where a railroad's first locomotive may go. */
export function startingCities(
  gameState: RideTheRailsGameState,
  railroad: Railroad,
): number[] {
  switch (railroad) {
    case "RED":
    case "BLUE":
      return EAST_CITIES;
    case "ORANGE":
      return [...EAST_CITIES, CHICAGO];
    case "YELLOW":
      return [...new Set([CHICAGO, ...occupiedCities(gameState).slice(0, 3)])];
    case "PURPLE":
      return WEST_CITIES;
    case "BLACK":
      return CITIES.filter((c) => isChicago(c) || hasRoom(gameState, c));
    default:
      return [];
  }
}

export function buildLimitFor(gameState: RideTheRailsGameState) {
  return buildLimit(gameState.public.players.length);
}

/** Locomotives the active player may still lay, were the next one on flat ground or in the mountains. */
export function placementsLeft(
  gameState: RideTheRailsGameState,
  mountain: boolean,
) {
  const limit =
    buildLimitFor(gameState) -
    (gameState.public.mountainBuilt || mountain ? 1 : 0);
  return Math.max(0, limit - gameState.public.built);
}

/** Why a locomotive may not go here, or nothing. */
export function placementProblem(
  gameState: RideTheRailsGameState,
  player: RideTheRailsPlayerState,
  railroad: Railroad,
  hex: number,
): string | null {
  if (!RAILROADS.includes(railroad)) return "That is not a railroad.";
  if (!isHex(hex) || !isLand(hex)) return "That is not on the map.";
  if (!openRailroads(gameState).includes(railroad))
    return `${label(railroad)} has not opened yet.`;
  if (sharesOf(player, railroad) === 0)
    return `You hold no ${label(railroad)} shares.`;
  if (gameState.public.supply[railroad] <= 0)
    return `${label(railroad)} has no locomotives left.`;
  if (placementsLeft(gameState, isMountain(hex)) <= 0)
    return isMountain(hex) && placementsLeft(gameState, false) > 0
      ? "Building in the mountains costs a placement you no longer have."
      : "You have laid all the track you may this turn.";
  const track = trackOf(gameState, railroad);
  if (track.includes(hex))
    return `${label(railroad)} already has a locomotive there.`;
  if (!hasRoom(gameState, hex)) return "That hex is full.";
  if (track.length === 0) {
    if (!startingCities(gameState, railroad).includes(hex))
      return `${label(railroad)} must start in one of its cities.`;
  } else if (!neighbours(hex).some((n) => track.includes(n))) {
    return `That does not touch the ${label(railroad)} track.`;
  }
  return null;
}

export type Placement = { railroad: Railroad; hex: number };

/** Every locomotive the active player could lay right now. */
export function legalPlacements(
  gameState: RideTheRailsGameState,
  player: RideTheRailsPlayerState,
): Placement[] {
  if (gameState.public.phase !== "BUILD") return [];
  const out: Placement[] = [];
  for (const railroad of openRailroads(gameState)) {
    if (sharesOf(player, railroad) === 0) continue;
    const track = trackOf(gameState, railroad);
    const candidates =
      track.length === 0
        ? startingCities(gameState, railroad)
        : [...new Set(track.flatMap((h) => neighbours(h)))];
    for (const hex of candidates)
      if (!placementProblem(gameState, player, railroad, hex))
        out.push({ railroad, hex });
  }
  return out;
}

export type Link = { to: number; path: number[] };

/** The links of one railroad out of a city: each other city reachable without passing through a third, with the hexes walked. */
export function linksFrom(
  gameState: RideTheRailsGameState,
  railroad: Railroad,
  from: number,
  used: Set<number> = new Set(),
): Link[] {
  const track = trackOf(gameState, railroad);
  if (!track.includes(from)) return [];
  const onTrack = new Set(track);
  const parent = new Map<number, number>();
  parent.set(from, -1);
  const queue = [from];
  const links: Link[] = [];
  while (queue.length) {
    const hex = queue.shift() as number;
    for (const next of neighbours(hex)) {
      if (!onTrack.has(next) || parent.has(next) || used.has(next)) continue;
      parent.set(next, hex);
      if (isCity(next)) {
        const path: number[] = [];
        for (let h = next; h !== from; h = parent.get(h) as number)
          path.unshift(h);
        links.push({ to: next, path });
      } else {
        queue.push(next);
      }
    }
  }
  return links;
}

export type Route = {
  hexes: number[];
  /** Links used per railroad. */
  links: { [railroad in Railroad]?: number };
};

/** Checks a journey and works out the hexes it uses, or says what is wrong. */
export function traceJourney(
  gameState: RideTheRailsGameState,
  journey: Journey,
): { ok: true; route: Route } | { ok: false; reason: string } {
  if (!journey || !isHex(journey.start) || !isCity(journey.start))
    return { ok: false, reason: "The journey must start in a city." };
  if (!hasPassenger(gameState, journey.start))
    return {
      ok: false,
      reason: `No passenger waits in ${cityName(journey.start)}.`,
    };
  const legs = Array.isArray(journey.legs) ? journey.legs : [];
  if (legs.length === 0)
    return {
      ok: false,
      reason: "The passenger must travel at least one link.",
    };
  const used = new Set<number>([journey.start]);
  const hexes = [journey.start];
  const links: Route["links"] = {};
  let at = journey.start;
  for (const leg of legs) {
    if (!leg || !RAILROADS.includes(leg.railroad) || !isHex(leg.to))
      return { ok: false, reason: "That is not a link." };
    const link = linksFrom(gameState, leg.railroad, at, used).find(
      (l) => l.to === leg.to,
    );
    if (!link)
      return {
        ok: false,
        reason: `${label(leg.railroad)} has no link from ${cityName(at)} to ${cityName(leg.to)} that avoids the hexes already visited.`,
      };
    for (const h of link.path) used.add(h);
    hexes.push(...link.path);
    links[leg.railroad] = (links[leg.railroad] ?? 0) + 1;
    at = leg.to;
  }
  return { ok: true, route: { hexes, links } };
}

/** Whether any passenger could be carried at all. */
export function anyRidePossible(gameState: RideTheRailsGameState) {
  return (gameState.public.passengers || []).some((city) =>
    RAILROADS.some((r) => linksFrom(gameState, r, city).length > 0),
  );
}

export type Payout = {
  earned: number;
  dividends: { email: string; amount: number }[];
};

/** What everyone would earn from a journey. */
export function payoutsFor(
  gameState: RideTheRailsGameState,
  route: Route,
): Payout {
  const legs = RAILROADS.reduce((n, r) => n + (route.links[r] ?? 0), 0);
  const earned = legs + 1;
  const dividends = gameState.public.players
    .map((p) => ({
      email: p.email,
      amount: RAILROADS.reduce(
        (n, r) => n + (route.links[r] ?? 0) * sharesOf(p, r),
        0,
      ),
    }))
    .filter((d) => d.amount > 0);
  return { earned, dividends };
}

/** Hexes joined by rail of any colour to a hex: used for the Transcontinental bonus. */
function connectedHexes(gameState: RideTheRailsGameState, from: number) {
  const seen = new Set<number>([from]);
  const queue = [from];
  while (queue.length) {
    const hex = queue.shift() as number;
    const here = railroadsIn(gameState, hex);
    for (const next of neighbours(hex)) {
      if (seen.has(next)) continue;
      if (!here.some((r) => trackOf(gameState, r).includes(next))) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  return seen;
}

export function isTranscontinental(gameState: RideTheRailsGameState) {
  for (const west of WEST_CITIES) {
    if (occupancy(gameState, west) === 0) continue;
    const reach = connectedHexes(gameState, west);
    if (EAST_CITIES.some((e) => reach.has(e))) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Turn flow
// ---------------------------------------------------------------------------

function setActive(gameState: RideTheRailsGameState, email: string) {
  gameState.public.activePlayer = email;
  const player = playerByEmail(gameState, email);
  if (player) player.lastActionAt = Date.now();
}

function touch(gameState: RideTheRailsGameState) {
  gameState.public.turn += 1;
}

function availableShares(gameState: RideTheRailsGameState) {
  return openRailroads(gameState).filter((r) => gameState.public.supply[r] > 0);
}

/** The share phase: shares go in reverse order. */
function startShares(gameState: RideTheRailsGameState) {
  const pub = gameState.public;
  pub.phase = "SHARE";
  pub.seat = pub.order.length - 1;
  setActive(gameState, pub.order[pub.seat]);
  skipSharesIfStuck(gameState);
}

function skipSharesIfStuck(gameState: RideTheRailsGameState) {
  while (
    !isGameOver(gameState) &&
    gameState.public.phase === "SHARE" &&
    availableShares(gameState).length === 0
  ) {
    announce(
      gameState,
      `${gameState.public.activePlayer} takes no share: every open railroad is out of locomotives.`,
    );
    advanceShare(gameState);
  }
}

function advanceShare(gameState: RideTheRailsGameState) {
  const pub = gameState.public;
  if (pub.seat > 0) {
    pub.seat -= 1;
    setActive(gameState, pub.order[pub.seat]);
  } else {
    startBuild(gameState);
  }
}

function startBuild(gameState: RideTheRailsGameState) {
  const pub = gameState.public;
  pub.phase = "BUILD";
  pub.seat = 0;
  pub.built = 0;
  pub.mountainBuilt = false;
  setActive(gameState, pub.order[0]);
  skipBuildIfStuck(gameState);
}

/** Ends build turns that have nothing left to lay, including whole turns with nowhere to build. */
function skipBuildIfStuck(gameState: RideTheRailsGameState) {
  while (!isGameOver(gameState) && gameState.public.phase === "BUILD") {
    const player = getActivePlayer(gameState);
    if (!player) return;
    if (legalPlacements(gameState, player).length > 0) return;
    const built = gameState.public.built;
    announce(
      gameState,
      built === 0
        ? `${player.email} has nowhere to build.`
        : `${player.email} has laid ${built} locomotive${built === 1 ? "" : "s"}.`,
    );
    advanceBuild(gameState);
  }
}

function advanceBuild(gameState: RideTheRailsGameState) {
  const pub = gameState.public;
  pub.built = 0;
  pub.mountainBuilt = false;
  if (pub.seat < pub.order.length - 1) {
    pub.seat += 1;
    setActive(gameState, pub.order[pub.seat]);
  } else {
    startRide(gameState);
  }
}

function startRide(gameState: RideTheRailsGameState) {
  const pub = gameState.public;
  pub.phase = "RIDE";
  pub.seat = 0;
  setActive(gameState, pub.order[0]);
  skipRideIfStuck(gameState);
}

function skipRideIfStuck(gameState: RideTheRailsGameState) {
  while (
    !isGameOver(gameState) &&
    gameState.public.phase === "RIDE" &&
    !anyRidePossible(gameState)
  ) {
    const email = gameState.public.activePlayer;
    announce(gameState, `${email} has no passenger to carry.`);
    gameState.public.lastMove = { type: "skip", email };
    advanceRide(gameState);
  }
}

function advanceRide(gameState: RideTheRailsGameState) {
  const pub = gameState.public;
  if (pub.seat < pub.order.length - 1) {
    pub.seat += 1;
    setActive(gameState, pub.order[pub.seat]);
  } else {
    endRound(gameState);
  }
}

function endRound(gameState: RideTheRailsGameState) {
  const pub = gameState.public;
  if (pub.round >= ROUNDS) {
    finish(gameState);
    return;
  }
  pub.round += 1;
  // Poorest first; ties keep their order from the round before.
  pub.order = pub.players
    .map((p) => ({ email: p.email, money: p.money }))
    .sort(
      (a, b) =>
        a.money - b.money ||
        pub.order.indexOf(a.email) - pub.order.indexOf(b.email),
    )
    .map((p) => p.email);
  const opened = RAILROADS.filter(
    (r) =>
      railroadsOpen(pub.round).includes(r) &&
      !railroadsOpen(pub.round - 1).includes(r),
  );
  announce(
    gameState,
    `Round ${pub.round} begins.`,
    `${opened.length ? `${opened.map(label).join(" and ")} opens. ` : ""}Turn order: ${pub.order.join(", ")}.`,
  );
  startShares(gameState);
}

function finish(gameState: RideTheRailsGameState) {
  const pub = gameState.public;
  pub.status = "GAME_OVER";
  const best = Math.max(...pub.players.map((p) => p.money));
  const winners = pub.players.filter((p) => p.money === best);
  const standings = [...pub.players]
    .sort((a, b) => b.money - a.money)
    .map((p) => `${p.email} ${money(p.money)}`)
    .join(", ");
  if (winners.length === 1) {
    pub.winner = winners[0].email;
    announce(gameState, `${winners[0].email} wins!`, standings);
  } else {
    pub.draw = true;
    announce(gameState, "The game is a draw.", standings);
  }
  publishLog(gameState);
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export function takeShare(
  gameState: RideTheRailsGameState,
  railroad: Railroad,
): ActionResult {
  if (isGameOver(gameState)) return { ok: false, reason: "The game is over." };
  if (gameState.public.phase !== "SHARE")
    return { ok: false, reason: "Shares are not being taken now." };
  const player = getActivePlayer(gameState);
  if (!player) return { ok: false, reason: "No active player." };
  if (!RAILROADS.includes(railroad))
    return { ok: false, reason: "That is not a railroad." };
  if (!openRailroads(gameState).includes(railroad))
    return { ok: false, reason: `${label(railroad)} has not opened yet.` };
  if (gameState.public.supply[railroad] <= 0)
    return {
      ok: false,
      reason: `${label(railroad)} has no locomotives left.`,
    };

  gameState.public.supply[railroad] -= 1;
  player.shares = {
    ...(player.shares || {}),
    [railroad]: sharesOf(player, railroad) + 1,
  };
  gameState.public.lastMove = { type: "share", email: player.email, railroad };
  announce(
    gameState,
    `${player.email} takes a ${label(railroad)} share.`,
    `${player.email} now holds ${sharesOf(player, railroad)} ${label(railroad)}.`,
  );
  touch(gameState);
  advanceShare(gameState);
  skipSharesIfStuck(gameState);
  return { ok: true };
}

export function buildTrack(
  gameState: RideTheRailsGameState,
  railroad: Railroad,
  hex: number,
): ActionResult {
  if (isGameOver(gameState)) return { ok: false, reason: "The game is over." };
  if (gameState.public.phase !== "BUILD")
    return { ok: false, reason: "Track is not being built now." };
  const player = getActivePlayer(gameState);
  if (!player) return { ok: false, reason: "No active player." };
  const problem = placementProblem(gameState, player, railroad, hex);
  if (problem) return { ok: false, reason: problem };

  const pub = gameState.public;
  const wasTranscontinental =
    !!pub.transcontinental || isTranscontinental(gameState);
  pub.supply[railroad] -= 1;
  pub.track = {
    ...(pub.track || {}),
    [railroad]: [...trackOf(gameState, railroad), hex],
  };
  pub.built += 1;
  if (isMountain(hex)) pub.mountainBuilt = true;
  pub.lastMove = { type: "build", email: player.email, railroad, hex };

  const notes: string[] = [];
  if (isChicago(hex)) {
    player.money += CHICAGO_BONUS;
    notes.push(`${money(CHICAGO_BONUS)} for building in Chicago`);
  }
  if (kindOf(hex) === "BONUS" && !(pub.bonusesClaimed || []).includes(hex)) {
    pub.bonusesClaimed = [...(pub.bonusesClaimed || []), hex];
    player.money += CITY_BONUS;
    notes.push(`${money(CITY_BONUS)} for being first into ${cityName(hex)}`);
  }
  if (!wasTranscontinental && isTranscontinental(gameState)) {
    const bonus = isCity(hex)
      ? TRANSCONTINENTAL_CITY_BONUS
      : TRANSCONTINENTAL_BONUS;
    pub.transcontinental = player.email;
    player.money += bonus;
    notes.push(`${money(bonus)} for the Transcontinental connection`);
  }
  const where = isCity(hex)
    ? cityName(hex)
    : isMountain(hex)
      ? "the mountains"
      : "open country";
  announce(
    gameState,
    `${player.email} lays ${label(railroad)} track in ${where}.`,
    notes.length ? `Bonuses: ${notes.join("; ")}.` : undefined,
  );
  touch(gameState);
  // The turn ends by itself once nothing more can be laid.
  skipBuildIfStuck(gameState);
  return { ok: true };
}

export function endBuild(gameState: RideTheRailsGameState): ActionResult {
  if (isGameOver(gameState)) return { ok: false, reason: "The game is over." };
  if (gameState.public.phase !== "BUILD")
    return { ok: false, reason: "Track is not being built now." };
  const player = getActivePlayer(gameState);
  if (!player) return { ok: false, reason: "No active player." };
  const built = gameState.public.built;
  announce(
    gameState,
    built === 0
      ? `${player.email} builds nothing.`
      : `${player.email} has laid ${built} locomotive${built === 1 ? "" : "s"}.`,
  );
  gameState.public.lastMove = { type: "end", email: player.email };
  touch(gameState);
  advanceBuild(gameState);
  skipBuildIfStuck(gameState);
  return { ok: true };
}

export function ride(
  gameState: RideTheRailsGameState,
  journey: Journey,
): ActionResult {
  if (isGameOver(gameState)) return { ok: false, reason: "The game is over." };
  if (gameState.public.phase !== "RIDE")
    return { ok: false, reason: "Passengers are not travelling now." };
  const player = getActivePlayer(gameState);
  if (!player) return { ok: false, reason: "No active player." };
  const traced = traceJourney(gameState, journey);
  if (!traced.ok) return traced;
  const { route } = traced;
  const pay = payoutsFor(gameState, route);

  const pub = gameState.public;
  player.money += pay.earned;
  for (const d of pay.dividends) {
    const p = playerByEmail(gameState, d.email);
    if (p) p.money += d.amount;
  }
  pub.passengers = (pub.passengers || []).filter((c) => c !== journey.start);
  const cleanJourney: Journey = {
    start: journey.start,
    legs: journey.legs.map((l) => ({ railroad: l.railroad, to: l.to })),
  };
  pub.lastRide = {
    email: player.email,
    journey: cleanJourney,
    hexes: route.hexes,
    earned: pay.earned,
    dividends: pay.dividends,
  } satisfies RideResult;
  pub.lastMove = { type: "ride", email: player.email };
  const end = cleanJourney.legs[cleanJourney.legs.length - 1].to;
  const via = RAILROADS.filter((r) => route.links[r])
    .map((r) => `${route.links[r]} ${label(r)}`)
    .join(", ");
  announce(
    gameState,
    `${player.email} carries a passenger from ${cityName(journey.start)} to ${cityName(end)} for ${money(pay.earned)}.`,
    `Links: ${via}. Dividends: ${
      pay.dividends.map((d) => `${d.email} ${money(d.amount)}`).join(", ") ||
      "none"
    }.`,
  );
  touch(gameState);
  advanceRide(gameState);
  skipRideIfStuck(gameState);
  return { ok: true };
}
