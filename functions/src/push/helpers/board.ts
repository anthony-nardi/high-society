import type { Card, Colour, DieFace } from "../types";

/*
 * The fixed facts of PUSH, after the Ravensburger rulebook: the deck, the
 * die and the rule of the columns. Pure and free of runtime imports: the
 * client bundles this file directly.
 */

export const COLOURS: Colour[] = ["RED", "BLUE", "YELLOW", "GREEN", "PURPLE"];

export const VALUES = [1, 2, 3, 4, 5, 6];

/** Three of every number in every colour. */
export const COPIES = 3;

export const DICE: Card = "DICE";
export const SWITCH: Card = "SWITCH";
export const DICE_CARDS = 18;
export const SWITCH_CARDS = 12;

export const MAX_COLUMNS = 3;

export const DIE_FACES: DieFace[] = [...COLOURS, "STAR"];

/** The 120 cards: 90 numbered, 18 dice and 12 switch cards. */
export function fullDeck(players = 3): Card[] {
  const deck: Card[] = [];
  for (const c of COLOURS)
    for (const v of VALUES)
      for (let k = 0; k < COPIES; k++) deck.push(`${c}_${v}`);
  for (let k = 0; k < DICE_CARDS; k++) deck.push(DICE);
  // With two players the switch cards do nothing and are left in the box.
  if (players > 2) for (let k = 0; k < SWITCH_CARDS; k++) deck.push(SWITCH);
  return deck;
}

export const isDice = (card: Card) => card === DICE;
export const isSwitch = (card: Card) => card === SWITCH;
export const isNumbered = (card: Card) => !isDice(card) && !isSwitch(card);

export function colourOf(card: Card): Colour | null {
  return isNumbered(card) ? (card.split("_")[0] as Colour) : null;
}

export function valueOf(card: Card): number {
  return isNumbered(card) ? Number(card.split("_")[1]) : 0;
}

export function points(cards: Card[]) {
  return cards.reduce((s, c) => s + valueOf(c), 0);
}

export function ofColour(cards: Card[], colour: Colour) {
  return cards.filter((c) => colourOf(c) === colour);
}

/** Never two of the same number or colour in a column, and one dice card at most. */
export function canPlace(column: Card[], card: Card): boolean {
  if (isSwitch(card)) return false;
  if (isDice(card)) return !column.some(isDice);
  const colour = colourOf(card);
  const value = valueOf(card);
  return !column.some((c) => colourOf(c) === colour || valueOf(c) === value);
}

/** Indices of the columns the card could join, plus a new one while fewer than three. */
export function placements(columns: Card[][], card: Card): number[] {
  const out: number[] = [];
  columns.forEach((col, i) => {
    if (canPlace(col, card)) out.push(i);
  });
  if (columns.length < MAX_COLUMNS && !isSwitch(card)) out.push(columns.length);
  return out;
}

const NAMES: { [c in Colour]: string } = {
  RED: "Red",
  BLUE: "Blue",
  YELLOW: "Yellow",
  GREEN: "Green",
  PURPLE: "Purple",
};

export function colourName(colour: Colour) {
  return NAMES[colour];
}

export function cardLabel(card: Card) {
  if (isDice(card)) return "Dice";
  if (isSwitch(card)) return "Switch";
  return `${colourName(colourOf(card) as Colour)} ${valueOf(card)}`;
}

export function columnLabel(cards: Card[]) {
  return cards.map(cardLabel).join(", ");
}
