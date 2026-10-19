import type {
  Card,
  Commodity,
  MediciGameState,
  MediciPlayerState,
} from "./types";
import displayName from "../../shared/utils/displayName";

export {
  bonusFor,
  cardLabel,
  COMMODITIES,
  commodityName,
  commodityOf,
  countOf,
  isGold,
  lotLabel,
  MAX_LOT,
  PAYMENTS,
  shipValue,
  TOP_LEVEL,
  TRACK_BONUS,
  trackAwards,
  valueOf,
} from "@games/medici/helpers/board";
import { commodityOf, valueOf } from "@games/medici/helpers/board";

/** Each commodity's colours and emblem. */
export const COMMODITY_INFO: {
  [c in Commodity | "GOLD"]: { colour: string; ink: string; emblem: string };
} = {
  CLOTH: { colour: "#4f78c2", ink: "#eaf1ff", emblem: "🧵" },
  SPICE: { colour: "#d9823b", ink: "#fff3e6", emblem: "🌶" },
  GRAIN: { colour: "#d8b14a", ink: "#3a2a08", emblem: "🌾" },
  DYE: { colour: "#8a4fb0", ink: "#f6ecff", emblem: "🫙" },
  FUR: { colour: "#8c6a4a", ink: "#fff1e0", emblem: "🦊" },
  GOLD: { colour: "#f2c25c", ink: "#3a2a08", emblem: "✦" },
};

/** Seat colours for the counters on the tracks. */
export const SEAT_COLOURS = [
  "#e63946",
  "#4cc9f0",
  "#f9c74f",
  "#43aa8b",
  "#f8f4e3",
  "#b5179e",
];

export function seatColour(gameState: MediciGameState, email: string) {
  const i = gameState.players.findIndex((p) => p.email === email);
  return SEAT_COLOURS[Math.max(0, i) % SEAT_COLOURS.length];
}

export function freeSpace(
  gameState: MediciGameState,
  player: MediciPlayerState,
) {
  return gameState.capacity - (player.ship || []).length;
}

export function isFull(gameState: MediciGameState, player: MediciPlayerState) {
  return freeSpace(gameState, player) <= 0;
}

export function maxFit(gameState: MediciGameState) {
  return Math.max(0, ...gameState.players.map((p) => freeSpace(gameState, p)));
}

/** Whether a player could bid anything at all on the lot as it stands. */
export function canBid(gameState: MediciGameState, player: MediciPlayerState) {
  const lot = gameState.lot || [];
  return (
    lot.length > 0 &&
    lot.length <= freeSpace(gameState, player) &&
    player.money > (gameState.highBid || 0)
  );
}

/** Players in bidding order: from the auctioneer's left round to the auctioneer. */
export function biddingOrder(gameState: MediciGameState) {
  const players = gameState.players;
  const start = players.findIndex((p) => p.email === gameState.auctioneer);
  const out: MediciPlayerState[] = [];
  for (let k = 1; k <= players.length; k++)
    out.push(players[(start + k) % players.length]);
  return out;
}

/** Short name for the table, "you" for the viewer. */
export function nameFor(email: string, me?: string | null) {
  return email === me ? "you" : displayName(email);
}

export function florins(n: number) {
  return `${n} florin${n === 1 ? "" : "s"}`;
}

/** Sorts a ship for display: by commodity, then value, gold last. */
export function sortedShip(cards: Card[]) {
  const order = ["CLOTH", "SPICE", "GRAIN", "DYE", "FUR", "GOLD"];
  return [...cards].sort(
    (a, b) =>
      order.indexOf(commodityOf(a)) - order.indexOf(commodityOf(b)) ||
      valueOf(b) - valueOf(a),
  );
}
