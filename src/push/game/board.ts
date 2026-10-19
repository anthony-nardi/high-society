import type { Card, Colour, PushGameState, PushPlayerState } from "./types";
import displayName from "../../shared/utils/displayName";

export {
  canPlace,
  cardLabel,
  colourName,
  colourOf,
  columnLabel,
  COLOURS,
  isDice,
  isNumbered,
  isSwitch,
  MAX_COLUMNS,
  ofColour,
  placements,
  points,
  valueOf,
} from "@games/push/helpers/board";

/** Each colour's paint and the shape the rulebook pairs it with. */
export const COLOUR_INFO: {
  [c in Colour]: { colour: string; ink: string; shape: string; name: string };
} = {
  RED: { colour: "#d9342b", ink: "#fff", shape: "▲", name: "Red" },
  BLUE: { colour: "#2f6fd6", ink: "#fff", shape: "■", name: "Blue" },
  YELLOW: { colour: "#e8c23a", ink: "#3a2a08", shape: "●", name: "Yellow" },
  GREEN: { colour: "#2e9e5b", ink: "#fff", shape: "◆", name: "Green" },
  PURPLE: { colour: "#8e5ad6", ink: "#fff", shape: "★", name: "Purple" },
};

export function scoreOf(player: PushPlayerState) {
  const all = [...(player.bench || []), ...(player.bank || [])];
  return all.reduce((s, c) => s + Number(c.split("_")[1] || 0), 0);
}

export function cardCount(player: PushPlayerState) {
  return (player.bench || []).length + (player.bank || []).length;
}

/** Short name for the table, "you" for the viewer. */
export function nameFor(email: string, me?: string | null) {
  return email === me ? "you" : displayName(email);
}

/** Who chooses after the pusher, in order, given the switches so far. */
export function chooseOrder(gameState: PushGameState) {
  const players = gameState.players;
  const start = players.findIndex((p) => p.email === gameState.turnPlayer);
  const step = gameState.switches % 2 ? -1 : 1;
  const out: string[] = [];
  for (let k = 1; k < players.length; k++)
    out.push(
      players[(start + step * k + players.length) % players.length].email,
    );
  return out;
}

/** Cards of a zone grouped by colour, in the rulebook's order, highest first. */
export function groupByColour(
  cards: Card[],
): { colour: Colour; cards: Card[] }[] {
  const order: Colour[] = ["RED", "BLUE", "YELLOW", "GREEN", "PURPLE"];
  return order
    .map((colour) => ({
      colour,
      cards: cards
        .filter((c) => c.startsWith(colour + "_"))
        .sort((a, b) => Number(b.split("_")[1]) - Number(a.split("_")[1])),
    }))
    .filter((g) => g.cards.length);
}
