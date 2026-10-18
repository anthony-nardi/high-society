import { FujiFlushGameState, FujiFlushPlayerState } from "../types";
import { DISTRIBUTION, HIGHEST, LOWEST, outcomeOf } from "./board";
import { cardsLeft, getActivePlayer, playCard } from "./rules";

/*
 * The bot's judgement. A card is worth the chance it survives until it is
 * pushed through (sooner when it joins a team whose turn comes first),
 * plus the tempo taken from everyone it flushes, less the help it gives
 * the team it joins and a little for spending a high number. Survival is
 * estimated from the cards still unseen: each opponent who plays before
 * the card is safe may hold something that beats it.
 */

export type BotMove = { card: number };

export function turnMoves(gameState: FujiFlushGameState): BotMove[] {
  if (gameState.public.status !== "IN_PROGRESS") return [];
  const player = getActivePlayer(gameState);
  if (!player) return [];
  return [...new Set(player.hand || [])].map((card) => ({ card }));
}

export function applyMove(gameState: FujiFlushGameState, move: BotMove) {
  return playCard(gameState, move.card);
}

/** Cards the bot cannot see: everything but its hand and the table. */
function unseen(gameState: FujiFlushGameState, me: FujiFlushPlayerState) {
  const pool: { [card: number]: number } = { ...DISTRIBUTION };
  for (const c of me.hand || []) pool[c] = Math.max(0, pool[c] - 1);
  for (const p of gameState.public.players)
    if (p.played !== undefined)
      pool[p.played] = Math.max(0, pool[p.played] - 1);
  return pool;
}

/** Opponents in turn order after the active player. */
function turnOrder(gameState: FujiFlushGameState, me: FujiFlushPlayerState) {
  const players = gameState.public.players;
  const start = players.indexOf(me);
  return players
    .slice(start + 1)
    .concat(players.slice(0, start))
    .filter((p) => p.email !== me.email);
}

/** A number is worth about this much per point: a 20 is a sure shed, a 2 is not. */
const EQUITY = 0.05;

export type Judgement = {
  card: number;
  survive: number;
  score: number;
};

export function judge(gameState: FujiFlushGameState): Judgement[] {
  const me = getActivePlayer(gameState);
  if (!me) return [];
  const players = gameState.public.players;
  const pool = unseen(gameState, me);
  const poolSize = Object.values(pool).reduce((s, n) => s + n, 0) || 1;
  const order = turnOrder(gameState, me);
  const meanUnseen =
    Object.entries(pool).reduce((s, [n, k]) => s + Number(n) * k, 0) / poolSize;

  return [...new Set(me.hand || [])].map((card) => {
    const outcome = outcomeOf(players, me.email, card);
    const team = new Set(outcome.joined);
    const flushed = new Set(outcome.flushed.map((f) => f.email));

    // Numbers left on the table after the play, counted for teaming up.
    const onTable: { [card: number]: number } = {};
    for (const p of players) {
      if (p.email === me.email || p.played === undefined) continue;
      if (flushed.has(p.email)) continue;
      onTable[p.played] = (onTable[p.played] || 0) + 1;
    }
    onTable[card] = (onTable[card] || 0) + 1;

    // Share of unseen cards that would beat the value when played now.
    let beating = 0;
    for (let n = LOWEST; n <= HIGHEST; n++) {
      if (n === card) continue;
      if (n * ((onTable[n] || 0) + 1) > outcome.value) beating += pool[n];
    }
    const beatShare = beating / poolSize;

    // Everyone who plays before the card is safe: up to the first teammate's turn.
    let survive = 1;
    for (const q of order) {
      if (team.has(q.email)) break;
      // A flushed player draws a replacement before their turn.
      const handSize = (q.hand || []).length + (flushed.has(q.email) ? 1 : 0);
      const canBeat = 1 - Math.pow(1 - beatShare, handSize);
      survive *= 1 - canBeat;
    }

    let score = survive;
    // Flushing costs a rival a turn; flushing someone on their last cards may cost them the game.
    for (const f of outcome.flushed) {
      const victim = players.find((p) => p.email === f.email);
      const left = victim ? cardsLeft(victim) : 3;
      score += left <= 1 ? 1.5 : left === 2 ? 0.8 : 0.35;
    }
    // Joining helps the team shed cards too; lending a hand to a leader is a mistake.
    for (const email of outcome.joined) {
      const mate = players.find((p) => p.email === email);
      const left = mate ? cardsLeft(mate) : 3;
      score -= survive * (left <= 1 ? 1.6 : left === 2 ? 0.7 : 0.3);
    }
    // Spending a number costs its worth, but a flushed card is swapped for an
    // average draw, which is a gain for a low one: dump the 2s, keep the 12s.
    score -= EQUITY * card;
    score += (1 - survive) * EQUITY * meanUnseen;
    return { card, survive, score };
  });
}

/** The card to play, or null without a hand. */
export function chooseCard(gameState: FujiFlushGameState): number | null {
  const options = judge(gameState);
  if (!options.length) return null;
  options.sort((a, b) => b.score - a.score || a.card - b.card);
  return options[0].card;
}
