import {
  Journey,
  Railroad,
  RideTheRailsGameState,
  RideTheRailsPlayerState,
} from "./types";
import { HEXES, MAP_HEIGHT, MAP_WIDTH } from "./map";

/*
 * Client-side copy of the map geometry and the rule queries the table
 * needs. Keep in step with functions/src/ride-the-rails/helpers.
 */

export { HEXES, MAP_HEIGHT, MAP_WIDTH };

export const RAILROADS: Railroad[] = [
  "RED",
  "BLUE",
  "ORANGE",
  "YELLOW",
  "PURPLE",
  "BLACK",
];

export const COLOURS: { [railroad in Railroad]: string } = {
  RED: "#d64545",
  BLUE: "#3b7dd8",
  ORANGE: "#ef8f2a",
  YELLOW: "#e9c832",
  PURPLE: "#8e5bc7",
  BLACK: "#2b2b2b",
};

export const OPENS: { [railroad in Railroad]: number } = {
  RED: 1,
  BLUE: 1,
  ORANGE: 2,
  YELLOW: 3,
  PURPLE: 4,
  BLACK: 5,
};

export const ROUNDS = 6;
export const HEX_CAPACITY = 2;
export const CHICAGO_BONUS = 2;
export const CITY_BONUS = 5;

export const label = (railroad: Railroad) =>
  railroad.charAt(0) + railroad.slice(1).toLowerCase();

export const railroadsOpen = (round: number) =>
  RAILROADS.filter((r) => OPENS[r] <= round);

export function buildLimit(playerCount: number) {
  if (playerCount <= 3) return 8;
  if (playerCount === 4) return 5;
  return 4;
}

export const hexIndex = (col: number, row: number) => row * MAP_WIDTH + col;
export const colOf = (hex: number) => hex % MAP_WIDTH;
export const rowOf = (hex: number) => Math.floor(hex / MAP_WIDTH);
export const isHex = (hex: number) =>
  Number.isInteger(hex) && hex >= 0 && hex < HEXES.length;
export const isLand = (hex: number) => isHex(hex) && HEXES[hex].land;
export const isMountain = (hex: number) => isHex(hex) && HEXES[hex].mountain;
export const isCity = (hex: number) => isHex(hex) && !!HEXES[hex].city;
export const cityName = (hex: number) => HEXES[hex]?.city ?? `hex ${hex}`;
export const kindOf = (hex: number) => HEXES[hex]?.kind;
export const isChicago = (hex: number) => kindOf(hex) === "CHICAGO";

export const CITIES: number[] = HEXES.map((h, i) => (h.city ? i : -1)).filter(
  (i) => i >= 0,
);
export const CHICAGO = CITIES.find((c) => isChicago(c)) as number;
export const EAST_CITIES = CITIES.filter((c) => kindOf(c) === "EAST");
export const WEST_CITIES = CITIES.filter((c) => kindOf(c) === "WEST");

const EVEN_ROW = [
  [-1, -1],
  [0, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
];
const ODD_ROW = [
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [0, 1],
  [1, 1],
];

const NEIGHBOURS: number[][] = HEXES.map((_, hex) => {
  const col = colOf(hex);
  const row = rowOf(hex);
  const deltas = row % 2 ? ODD_ROW : EVEN_ROW;
  const out: number[] = [];
  for (const [dc, dr] of deltas) {
    const c = col + dc;
    const r = row + dr;
    if (c < 0 || c >= MAP_WIDTH || r < 0 || r >= MAP_HEIGHT) continue;
    const n = hexIndex(c, r);
    if (HEXES[n].land) out.push(n);
  }
  return out;
});

export const neighbours = (hex: number): number[] =>
  isHex(hex) ? NEIGHBOURS[hex] : [];

/** Centre of a hex on a canvas where a hex is one unit wide. */
export function centreOf(hex: number) {
  const row = rowOf(hex);
  return { x: colOf(hex) + (row % 2 ? 0.5 : 0) + 0.5, y: row * 0.866 + 0.5 };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const trackOf = (
  gameState: RideTheRailsGameState,
  railroad: Railroad,
): number[] => gameState.track?.[railroad] || [];

export const sharesOf = (player: RideTheRailsPlayerState, railroad: Railroad) =>
  player.shares?.[railroad] ?? 0;

export const totalShares = (player: RideTheRailsPlayerState) =>
  RAILROADS.reduce((n, r) => n + sharesOf(player, r), 0);

export const openRailroads = (gameState: RideTheRailsGameState) =>
  railroadsOpen(gameState.round);

export const hasPassenger = (gameState: RideTheRailsGameState, hex: number) =>
  (gameState.passengers || []).includes(hex);

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

export function occupiedCities(gameState: RideTheRailsGameState) {
  return CITIES.filter((c) => occupancy(gameState, c) > 0).sort(
    (a, b) => colOf(a) - colOf(b) || rowOf(a) - rowOf(b),
  );
}

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

export function placementsLeft(
  gameState: RideTheRailsGameState,
  mountain: boolean,
) {
  const limit =
    buildLimit(gameState.players.length) -
    (gameState.mountainBuilt || mountain ? 1 : 0);
  return Math.max(0, limit - gameState.built);
}

export function placementProblem(
  gameState: RideTheRailsGameState,
  player: RideTheRailsPlayerState,
  railroad: Railroad,
  hex: number,
): string | null {
  if (!isHex(hex) || !isLand(hex)) return "That is not on the map.";
  if (!openRailroads(gameState).includes(railroad))
    return `${label(railroad)} has not opened yet.`;
  if (sharesOf(player, railroad) === 0)
    return `You hold no ${label(railroad)} shares.`;
  if (gameState.supply[railroad] <= 0)
    return `${label(railroad)} has no locomotives left.`;
  if (placementsLeft(gameState, isMountain(hex)) <= 0)
    return "You have laid all the track you may this turn.";
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

/** Hexes where the player could lay a locomotive of this railroad. */
export function legalHexes(
  gameState: RideTheRailsGameState,
  player: RideTheRailsPlayerState,
  railroad: Railroad,
): number[] {
  if (gameState.phase !== "BUILD") return [];
  const track = trackOf(gameState, railroad);
  const candidates =
    track.length === 0
      ? startingCities(gameState, railroad)
      : [...new Set(track.flatMap((h) => neighbours(h)))];
  return candidates.filter(
    (hex) => !placementProblem(gameState, player, railroad, hex),
  );
}

export type Link = { to: number; path: number[] };

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
  links: { [railroad in Railroad]?: number };
};

/** The hexes a journey so far uses, and the links available next. */
export function traceJourney(
  gameState: RideTheRailsGameState,
  journey: Journey,
): { route: Route; at: number; next: { railroad: Railroad; link: Link }[] } {
  const used = new Set<number>([journey.start]);
  const hexes = [journey.start];
  const links: Route["links"] = {};
  let at = journey.start;
  for (const leg of journey.legs) {
    const link = linksFrom(gameState, leg.railroad, at, used).find(
      (l) => l.to === leg.to,
    );
    if (!link) break;
    for (const h of link.path) used.add(h);
    hexes.push(...link.path);
    links[leg.railroad] = (links[leg.railroad] ?? 0) + 1;
    at = leg.to;
  }
  const next = RAILROADS.flatMap((railroad) =>
    linksFrom(gameState, railroad, at, used).map((link) => ({
      railroad,
      link,
    })),
  );
  return { route: { hexes, links }, at, next };
}

export function payoutsFor(gameState: RideTheRailsGameState, route: Route) {
  const legs = RAILROADS.reduce((n, r) => n + (route.links[r] ?? 0), 0);
  const earned = legs + 1;
  const dividends = gameState.players
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

/** Cities a passenger could leave from right now. */
export function ridableCities(gameState: RideTheRailsGameState) {
  return (gameState.passengers || []).filter((city) =>
    RAILROADS.some((r) => linksFrom(gameState, r, city).length > 0),
  );
}
