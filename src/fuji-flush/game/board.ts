export {
  DISTRIBUTION,
  HIGHEST,
  LOWEST,
  countOnTable,
  handSize,
  outcomeOf,
  tableValue,
  valueOf,
} from "@games/fuji-flush/helpers/board";
export type { Outcome } from "@games/fuji-flush/helpers/board";
import { outcomeOf } from "@games/fuji-flush/helpers/board";
import type { FujiFlushGameState, FujiFlushPlayerState } from "./types";
import displayName from "../../shared/utils/displayName";

/** Cards a player still has to get rid of: in hand and in front. */
export const cardsLeft = (player: FujiFlushPlayerState) =>
  (player.hand || []).length + (player.played === undefined ? 0 : 1);

/** Meadow, forest, snowline or summit: the card's colour band. */
export type Band = 0 | 1 | 2 | 3;
export const bandOf = (card: number): Band =>
  card <= 5 ? 0 : card <= 10 ? 1 : card <= 15 ? 2 : 3;

/** "a", "a and b", "a, b and c". */
export function list(names: string[]) {
  return names.length <= 1
    ? names.join("")
    : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** Display names, "you" for the viewer. */
export const nameFor = (email: string, me?: string | null) =>
  email === me ? "you" : displayName(email);

const WORDS = [
  "",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
];

/** What a card would do, in a sentence. */
export function preview(
  gameState: FujiFlushGameState,
  email: string,
  card: number,
) {
  const o = outcomeOf(gameState.players, email, card);
  const name = (e: string) => nameFor(e, email);
  const parts: string[] = [];
  if (o.joined.length) {
    const n = o.joined.length + 1;
    parts.push(
      `Joins ${list(o.joined.map(name))}: ${WORDS[n] || n} ${card}s make ${o.value}.`,
    );
  }
  if (o.flushed.length)
    parts.push(
      `Flushes ${list(o.flushed.map((f) => `${name(f.email)}'s ${f.card}`))}.`,
    );
  if (o.above.length)
    parts.push(
      `Stays under ${list(o.above.map((a) => `${name(a.email)}'s ${a.value}`))}.`,
    );
  if (o.level.length)
    parts.push(
      `Level with ${list(o.level.map((l) => name(l.email)))}: neither is flushed.`,
    );
  if (!parts.length)
    parts.push(
      gameState.players.some((p) => p.email !== email && p.played !== undefined)
        ? "Tops the table."
        : "Nothing on the table yet.",
    );
  return parts.join(" ");
}
