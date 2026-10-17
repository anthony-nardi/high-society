import {
  ChipCounts,
  ChipValue,
  CHIP_VALUES,
  FamilyIncGameState,
} from "./types";

/*
 * Client-side arithmetic over the public state: what a player counting
 * chips at the table can work out. Keep in step with
 * functions/src/family-inc/helpers/rules.ts.
 */

export const count = (counts: ChipCounts | undefined, value: ChipValue) =>
  counts?.[value] || 0;

export const pileSize = (counts: ChipCounts | undefined) =>
  CHIP_VALUES.reduce((sum, value) => sum + count(counts, value), 0);

export const chipPoints = (counts: ChipCounts | undefined) =>
  CHIP_VALUES.reduce(
    (sum, value) => sum + count(counts, value) * Number(value),
    0,
  );

export const heldValues = (counts: ChipCounts | undefined) =>
  CHIP_VALUES.filter((value) => count(counts, value) > 0);

export const totalChips = (counts: ChipCounts | undefined) =>
  CHIP_VALUES.reduce((sum, value) => sum + count(counts, value), 0);

/** Chance the next draw repeats a value the player already holds. */
export function bustChance(pile: ChipCounts, held: ChipCounts | undefined) {
  const total = pileSize(pile);
  if (total === 0) return 0;
  const bad = heldValues(held).reduce(
    (sum, value) => sum + count(pile, value),
    0,
  );
  return bad / total;
}

export type Steal = { from: string; value: ChipValue; n: number };

/** What the active player would take from everyone else by stopping now. */
export function stealsOnStop(gameState: FamilyIncGameState, email: string) {
  const me = gameState.players.find((p) => p.email === email);
  const steals: Steal[] = [];
  if (!me) return { steals, points: 0 };
  for (const other of gameState.players) {
    if (other.email === email) continue;
    for (const value of heldValues(me.held)) {
      const n = count(other.held, value);
      if (n > 0) steals.push({ from: other.email, value, n });
    }
  }
  const points = steals.reduce((sum, s) => sum + s.n * Number(s.value), 0);
  return { steals, points };
}

/** Values a player holds that the active player also holds, so a stop would take them. */
export function valuesAtRisk(
  gameState: FamilyIncGameState,
  email: string,
): ChipValue[] {
  const active = gameState.players.find(
    (p) => p.email === gameState.activePlayer,
  );
  const me = gameState.players.find((p) => p.email === email);
  if (!active || !me || active.email === email) return [];
  const theirs = heldValues(active.held);
  return heldValues(me.held).filter((value) => theirs.includes(value));
}
