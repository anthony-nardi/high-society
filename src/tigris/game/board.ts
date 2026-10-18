export {
  ACTIONS_PER_TURN,
  ALL_CELLS,
  BORDER,
  COLOURS,
  COLS,
  HAND_SIZE,
  LEADER_NAME,
  MONUMENT_PAIRS,
  POINT_NAME,
  RIVER,
  ROWS,
  SHEDU,
  TILE_NAME,
  canPlaceLeader,
  canPlaceTile,
  compareSpheres,
  components,
  finalSpheres,
  isBorder,
  isEmptyCell,
  isKingdom,
  isRiver,
  key,
  label,
  neighbours,
  parse,
  squareCells,
  supporters,
  templesAdjacent,
  tileAt,
} from "@games/tigris/helpers/board";
export type { BoardView, Component } from "@games/tigris/helpers/board";
import type { Colour, Dynasty } from "./types";

/** The four spheres on screen. */
export const COLOUR_HEX: { [colour in Colour]: string } = {
  RED: "#c94a3d",
  BLUE: "#3f7fc6",
  GREEN: "#4f9a4a",
  BLACK: "#3b3f4a",
};

/** A lighter tint for chips and outlines. */
export const COLOUR_SOFT: { [colour in Colour]: string } = {
  RED: "#e8857a",
  BLUE: "#86b4e6",
  GREEN: "#8ccb86",
  BLACK: "#9aa0ad",
};

export const COLOUR_WORD: { [colour in Colour]: string } = {
  RED: "red",
  BLUE: "blue",
  GREEN: "green",
  BLACK: "black",
};

export const DYNASTY_SYMBOL: { [d in Dynasty]: string } = {
  ARCHER: "🏹",
  BULL: "🐂",
  LION: "🦁",
  POT: "🏺",
};

export const DYNASTY_WORD: { [d in Dynasty]: string } = {
  ARCHER: "Archer",
  BULL: "Bull",
  LION: "Lion",
  POT: "Pot",
};

/** "a", "a and b", "a, b and c". */
export function list(names: string[]) {
  return names.length <= 1
    ? names.join("")
    : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
