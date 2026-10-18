import { CardType, EcosystemGameState, Grid, Play } from "../types";
import {
  CARD_TYPES,
  cellKey,
  countOf,
  DIVERSITY,
  longestStream,
  openCells,
  parseCell,
  scoreGrid,
} from "./board";
import { choose, getActivePlayer, gridOf, hasChosen, mayAct } from "./rules";

/*
 * The bot's judgement: an ecosystem is worth its card points, a diversity
 * estimate, a guess at the stream and wolf placings, and a little for the
 * room it leaves to grow. Each card in hand is tried in every open cell,
 * a Rabbit in every swap too, and the best outcome wins.
 */

export type BotMove = Play;

export function turnMoves(gameState: EcosystemGameState): BotMove[] {
  if (gameState.public.status !== "IN_PROGRESS") return [];
  const email = gameState.public.activePlayer;
  const player = gameState.public.players.find((p) => p.email === email);
  if (!player || hasChosen(gameState, email) || !mayAct(gameState, email))
    return [];
  const grid = gridOf(player);
  const cells = openCells(grid);
  const out: BotMove[] = [];
  (player.hand || []).forEach((_, card) => {
    for (const cell of cells) {
      const [row, col] = parseCell(cell);
      out.push({ email, card, row, col });
    }
  });
  return out;
}

export function applyMove(gameState: EcosystemGameState, move: BotMove) {
  return choose(gameState, move.email, move);
}

/** Cash-free worth of a grid, with stream and wolf placings guessed. */
export function evaluateGrid(
  gameState: EcosystemGameState,
  email: string,
  grid: Grid,
) {
  const byType = scoreGrid(grid);
  let total = CARD_TYPES.reduce((s, t) => s + (byType[t] ?? 0), 0);
  const rivals = gameState.public.players.filter((p) => p.email !== email);
  const rivalStreams = rivals.map((p) => longestStream(gridOf(p)));
  const rivalWolves = rivals.map((p) => countOf(gridOf(p), "WOLF"));
  const stream = longestStream(grid);
  const wolves = countOf(grid, "WOLF");
  const streamPoints =
    stream > Math.max(0, ...rivalStreams)
      ? 8
      : stream > 0 && stream >= Math.max(0, ...rivalStreams) - 1
        ? 5
        : 0;
  const wolfPoints =
    wolves > Math.max(0, ...rivalWolves)
      ? 12
      : wolves > 0 && wolves >= Math.max(0, ...rivalWolves)
        ? 8
        : wolves >= 2
          ? 4
          : 0;
  // Early on a stream or wolf is a promise rather than points: the
  // placing counts as the game fills in, and each card a little on its own.
  const placed = Object.keys(grid).length;
  const progress = placed / 20;
  total +=
    streamPoints * progress + stream * 0.5 + wolfPoints * progress + wolves * 1;
  const scoring =
    CARD_TYPES.filter((t) => (byType[t] ?? 0) > 0).length +
    (streamPoints ? 1 : 0) +
    (wolfPoints ? 1 : 0);
  total +=
    DIVERSITY(Math.min(scoring + Math.round((1 - progress) * 2), 11)) *
    (0.3 + 0.7 * progress);
  // Open space keeps options; a few points per open cell early.
  total += openCells(grid).length * 0.4 * (1 - progress);
  return total;
}

function withPlay(
  grid: Grid,
  card: CardType,
  row: number,
  col: number,
  swap?: [string, string],
) {
  const next: Grid = { ...grid, [cellKey(row, col)]: card };
  if (swap && card === "RABBIT") {
    const [a, b] = swap;
    if (next[a] && next[b] && a !== b) [next[a], next[b]] = [next[b], next[a]];
  }
  return next;
}

export function chooseBotMove(gameState: EcosystemGameState): BotMove | null {
  const player = getActivePlayer(gameState);
  if (!player || !mayAct(gameState, player.email)) return null;
  const email = player.email;
  const grid = gridOf(player);
  const cells = openCells(grid).map(parseCell);
  const hand = player.hand || [];
  const base = evaluateGrid(gameState, email, grid);
  let best: BotMove | null = null;
  let bestValue = -Infinity;
  hand.forEach((card, index) => {
    for (const [row, col] of cells) {
      const placed = withPlay(grid, card, row, col);
      let value = evaluateGrid(gameState, email, placed) - base;
      let swap: [string, string] | undefined;
      if (card === "RABBIT") {
        // Try every swap of two cards, the new rabbit included.
        const keys = Object.keys(placed);
        for (let i = 0; i < keys.length; i++)
          for (let j = i + 1; j < keys.length; j++) {
            if (placed[keys[i]] === placed[keys[j]]) continue;
            const swappedGrid = withPlay(grid, card, row, col, [
              keys[i],
              keys[j],
            ]);
            const v = evaluateGrid(gameState, email, swappedGrid) - base;
            if (v > value + 0.01) {
              value = v;
              swap = [keys[i], keys[j]];
            }
          }
      }
      // Keeping a card from the next player is worth a little when the move is otherwise equal.
      value += hand.length > 1 ? 0 : 0;
      if (value > bestValue) {
        bestValue = value;
        best = { email, card: index, row, col, ...(swap ? { swap } : {}) };
      }
    }
  });
  return best;
}
