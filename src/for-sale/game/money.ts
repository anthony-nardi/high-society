import { ForSalePlayerState } from "./types";

/** Money is kept in thousands; this prints it. */
export const money = (thousands: number) =>
  `$${(thousands * 1000).toLocaleString("en-US")}`;

/** What passing costs now: half the standing bid, rounded up. */
export const passCost = (bid: number) => Math.ceil(bid / 2);

export const chequeTotal = (player: ForSalePlayerState) =>
  (player.cheques || []).reduce((s, c) => s + c, 0);

export const totalOf = (player: ForSalePlayerState) =>
  player.money + chequeTotal(player);

/** Six grades of property, from a cardboard box to a tower. */
export type Tier = 1 | 2 | 3 | 4 | 5 | 6;
export const tierOf = (property: number): Tier =>
  Math.min(6, Math.max(1, Math.ceil(property / 5))) as Tier;

export const TIER_NAMES: { [tier in Tier]: string } = {
  1: "a cardboard box",
  2: "a shack",
  3: "a cottage",
  4: "a town house",
  5: "a mansion",
  6: "a tower",
};
