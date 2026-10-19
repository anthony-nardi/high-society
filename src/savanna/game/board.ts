export {
  CARD_TYPES,
  COLS,
  DECK_COUNTS,
  HAND_SIZE,
  LANDFORMS,
  PICKS,
  ROWS,
  bounds,
  canPlace,
  cellKey,
  countOf,
  isAnimal,
  label,
  neighbours,
  openCells,
  parseCell,
  scoreGrid,
  totalOf,
} from "@games/savanna/helpers/board";
import {
  scoreGrid as score,
  totalOf as total,
} from "@games/savanna/helpers/board";
import type {
  CardType,
  Grid,
  SavannaGameState,
  SavannaPlayerState,
} from "./types";

export const CARD_INFO: {
  [type in CardType]: { emoji: string; colour: string; rule: string };
} = {
  WATERING_HOLE: {
    emoji: "💧",
    colour: "#7fc4e0",
    rule: "2 for each different type of animal adjacent to it.",
  },
  GRASSLAND: {
    emoji: "🌾",
    colour: "#c9b35a",
    rule: "Connected groups score 1/4/9/16 for 1/2/3/4 or more; a group never scores more than 16.",
  },
  TREE: {
    emoji: "🌳",
    colour: "#6fa85a",
    rule: "2 for each row and each column with a tree in it.",
  },
  GAZELLE: {
    emoji: "🦌",
    colour: "#e0b070",
    rule: "2 each; most gazelles at the end earns 5 more, second most 2. Ties all earn the place.",
  },
  ZEBRA: {
    emoji: "🦓",
    colour: "#d0d0d0",
    rule: "3 for each adjacent grassland.",
  },
  GIRAFFE: {
    emoji: "🦒",
    colour: "#f2c25c",
    rule: "5 if adjacent to a tree, else 0.",
  },
  CHEETAH: {
    emoji: "🐆",
    colour: "#e8a04a",
    rule: "3 for each gazelle on the same diagonal, any distance; those gazelles are then flipped facedown.",
  },
  LION: {
    emoji: "🦁",
    colour: "#d9823b",
    rule: "If adjacent to a grassland, flips one faceup gazelle or zebra anywhere in your ecosystem and scores 4.",
  },
  ELEPHANT: {
    emoji: "🐘",
    colour: "#9a9aa8",
    rule: "6, minus 2 for each adjacent animal other than elephants and flipped cards.",
  },
  HYENA: {
    emoji: "🐕",
    colour: "#b08a62",
    rule: "3 for each flipped card within 2 spaces in any direction.",
  },
  VULTURE: {
    emoji: "🦅",
    colour: "#8c7a6b",
    rule: "4 for each flipped card lower in the same column.",
  },
};

/** The ecosystem scored as it stands: the flips the cheetahs and lions would make, the gazelle bonus unknown until the end. */
export function runningScore(grid: Grid) {
  const scored = score(grid);
  return { ...scored, total: total(scored.byType) };
}

export const gridOf = (player: SavannaPlayerState): Grid => player.grid || {};
export const hasChosen = (state: SavannaGameState, email: string) =>
  (state.chosen || []).includes(email);
