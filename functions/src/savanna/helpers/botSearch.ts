import { CardType, Grid, Play, SavannaGameState } from "../types";
import {
  cellKey,
  countOf,
  openCells,
  parseCell,
  scoreGrid,
  totalOf,
} from "./board";
import { choose, getActivePlayer, gridOf, hasChosen, mayAct } from "./rules";

/*
 * The bot's judgement: an ecosystem is worth its points as the rulebook
 * would score it now, a guess at the gazelle bonus, and a little for the
 * room it leaves to grow. Each card in hand is tried in every open cell.
 */

export type BotMove = Play;

export function turnMoves(gameState: SavannaGameState): BotMove[] {
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

export function applyMove(gameState: SavannaGameState, move: BotMove) {
  return choose(gameState, move.email, move);
}

export function evaluateGrid(
  gameState: SavannaGameState,
  email: string,
  grid: Grid,
) {
  const scored = scoreGrid(grid);
  let total = totalOf(scored.byType);
  const rivals = gameState.public.players
    .filter((p) => p.email !== email)
    .map((p) => countOf(gridOf(p), "GAZELLE"));
  const most = Math.max(0, ...rivals);
  const placed = Object.keys(grid).length;
  const progress = placed / 20;
  const bonus =
    scored.gazelles > most
      ? 5
      : scored.gazelles > 0 && scored.gazelles >= most
        ? 2
        : 0;
  total += bonus * progress;
  total += openCells(grid).length * 0.4 * (1 - progress);
  return total;
}

function withPlay(grid: Grid, card: CardType, row: number, col: number) {
  return { ...grid, [cellKey(row, col)]: card } as Grid;
}

export function chooseBotMove(gameState: SavannaGameState): BotMove | null {
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
      const value =
        evaluateGrid(gameState, email, withPlay(grid, card, row, col)) - base;
      if (value > bestValue) {
        bestValue = value;
        best = { email, card: index, row, col };
      }
    }
  });
  return best;
}
