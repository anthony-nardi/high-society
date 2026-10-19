export {
  CARD_TYPES,
  COLS,
  GROUP_OF,
  HAND_SIZE,
  PREY,
  ROWS,
  bounds,
  canMove,
  canPlace,
  cellKey,
  chooseFlips,
  countOf,
  faceUp,
  foodWeb,
  label,
  moveTargets,
  neighbours,
  openCells,
  parseCell,
  scoreGrid,
} from "@games/coral-reef/helpers/board";
import {
  chooseFlips as flipsFor,
  countOf as count,
  faceUp as up,
  foodWeb as web,
  scoreGrid as score,
} from "@games/coral-reef/helpers/board";
import type {
  CardType,
  CoralReefGameState,
  CoralReefPlayerState,
  FoodWebGroup,
  Grid,
} from "./types";

export const CARD_INFO: {
  [type in CardType]: { emoji: string; colour: string; rule: string };
} = {
  CORAL: {
    emoji: "🪸",
    colour: "#e8847a",
    rule: "3 if it is on the bottom row of your reef, else 0.",
  },
  KRILL: {
    emoji: "🦐",
    colour: "#f0b27a",
    rule: "Connected groups score 1/4/9 for 1/2/3 or more krill; a group never scores more than 9.",
  },
  PLANKTON: {
    emoji: "🦠",
    colour: "#9fd8a8",
    rule: "Most plankton at the end: 12, second 8, third 4. Ties all earn the place.",
  },
  GROUPER: {
    emoji: "🐟",
    colour: "#7fa6d9",
    rule: "3 for each adjacent krill.",
  },
  CLOWNFISH: {
    emoji: "🐠",
    colour: "#f59e42",
    rule: "2 for each adjacent plankton and each adjacent coral.",
  },
  CRAB: {
    emoji: "🦀",
    colour: "#d9534f",
    rule: "2 for each plankton anywhere in the same row.",
  },
  EEL: {
    emoji: "🐍",
    colour: "#8fbf5f",
    rule: "4 for each adjacent prey (grouper, clownfish, crab), only if a coral is adjacent.",
  },
  SHARK: {
    emoji: "🦈",
    colour: "#8a9bb0",
    rule: "2 for each prey in the same row and each prey in the same column.",
  },
  WHALE: {
    emoji: "🐋",
    colour: "#5b7fb5",
    rule: "Flips one adjacent card facedown before scoring, then 2 for each krill anywhere in your reef.",
  },
  TURTLE: {
    emoji: "🐢",
    colour: "#6fb3a0",
    rule: "2 for each row and each column with a turtle in it.",
  },
  OCTOPUS: {
    emoji: "🐙",
    colour: "#b57fd1",
    rule: "3, and when placed you may move one of your cards or swap two.",
  },
};

export const GROUP_LABEL: { [g in FoodWebGroup]: string } = {
  PRODUCERS: "Producers",
  PREY: "Prey",
  PREDATORS: "Predators",
};

export const GROUP_COLOUR: { [g in FoodWebGroup]: string } = {
  PRODUCERS: "#9fd8a8",
  PREY: "#f59e42",
  PREDATORS: "#8a9bb0",
};

/** A running total for the table: card points with the whales' flips chosen, the plankton placing unknown until the end. */
export function runningScore(grid: Grid) {
  const flipped = count(grid, "WHALE") ? flipsFor(grid) : [];
  const byType = score(grid, flipped);
  const plankton = count(up(grid, flipped), "PLANKTON");
  const w = web(byType);
  return { byType, flipped, plankton, ...w };
}

export const gridOf = (player: CoralReefPlayerState): Grid => player.grid || {};
export const hasChosen = (state: CoralReefGameState, email: string) =>
  (state.chosen || []).includes(email);
