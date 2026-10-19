import { CardType, CoralReefGameState, Grid, Play } from "../types";
import {
  canMove,
  cellKey,
  chooseFlips,
  countOf,
  faceUp,
  foodWeb,
  moveTargets,
  openCells,
  parseCell,
  scoreGrid,
} from "./board";
import { choose, getActivePlayer, gridOf, hasChosen, mayAct } from "./rules";

/*
 * The bot's judgement: a reef is worth its card points with the food web
 * bonus, a guess at the plankton placing, and a little for the room it
 * leaves to grow. Each card in hand is tried in every open cell, an
 * Octopus in every swap and move too, and the best outcome wins.
 */

export type BotMove = Play;

export function turnMoves(gameState: CoralReefGameState): BotMove[] {
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

export function applyMove(gameState: CoralReefGameState, move: BotMove) {
  return choose(gameState, move.email, move);
}

/** Worth of a grid: points with the whales' flips chosen, a plankton guess, and room to grow. */
export function evaluateGrid(
  gameState: CoralReefGameState,
  email: string,
  grid: Grid,
) {
  const flips = countOf(grid, "WHALE") ? chooseFlips(grid) : [];
  const byType = scoreGrid(grid, flips);
  const plankton = countOf(faceUp(grid, flips), "PLANKTON");
  const rivals = gameState.public.players
    .filter((p) => p.email !== email)
    .map((p) => countOf(gridOf(p), "PLANKTON"));
  const most = Math.max(0, ...rivals);
  const placed = Object.keys(grid).length;
  const progress = placed / 20;
  // Early on plankton is a promise; later the placing is nearly settled.
  const placing =
    plankton > most
      ? 12
      : plankton > 0 && plankton >= most
        ? 8
        : plankton > 0 && plankton >= most - 1
          ? 4
          : 0;
  if (plankton)
    byType.PLANKTON = Math.round(
      placing * progress + plankton * 1.5 * (1 - progress),
    );
  let total = foodWeb(byType).total;
  total += openCells(grid).length * 0.4 * (1 - progress);
  return total;
}

function withPlay(grid: Grid, card: CardType, row: number, col: number) {
  return { ...grid, [cellKey(row, col)]: card } as Grid;
}

export function chooseBotMove(gameState: CoralReefGameState): BotMove | null {
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
      let move: [string, string] | undefined;
      if (card === "OCTOPUS") {
        const keys = Object.keys(placed);
        // Every swap of two different cards.
        for (let i = 0; i < keys.length; i++)
          for (let j = i + 1; j < keys.length; j++) {
            if (placed[keys[i]] === placed[keys[j]]) continue;
            const g: Grid = { ...placed };
            [g[keys[i]], g[keys[j]]] = [g[keys[j]], g[keys[i]]];
            const v = evaluateGrid(gameState, email, g) - base;
            if (v > value + 0.01) {
              value = v;
              swap = [keys[i], keys[j]];
              move = undefined;
            }
          }
        // Every move of one card to a cell that keeps the reef whole.
        for (const from of keys)
          for (const to of moveTargets(placed, from)) {
            if (!canMove(placed, from, to)) continue;
            const g: Grid = { ...placed };
            g[to] = g[from];
            delete g[from];
            const v = evaluateGrid(gameState, email, g) - base;
            if (v > value + 0.01) {
              value = v;
              move = [from, to];
              swap = undefined;
            }
          }
      }
      if (value > bestValue) {
        bestValue = value;
        best = {
          email,
          card: index,
          row,
          col,
          ...(swap ? { swap } : {}),
          ...(move ? { move } : {}),
        };
      }
    }
  });
  return best;
}
