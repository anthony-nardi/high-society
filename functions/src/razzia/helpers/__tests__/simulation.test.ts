import { describe, expect, it, vi } from "vitest";

vi.mock("../../../shared/helpers", () => ({
  shuffle: () => undefined,
  updatePlayerLastAction: (player: { lastActionAt: number }) => {
    player.lastActionAt = Date.now();
  },
  updateGameState: vi.fn().mockResolvedValue(undefined),
  getGameName: vi.fn(),
  createGame: vi.fn(),
}));

import { buildDeck, buildGameState } from "..";
import { applyBotMove, maybeTakeBotTurn } from "../bot";
import { BotMove } from "../botSearch";
import {
  biddableMoney,
  canCallAuction,
  canPass,
  canReveal,
  canUseThief,
  getActivePlayer,
  isAuction,
} from "../rules";
import { LootCards, RazziaGameState } from "../../types";

/** Deterministic PRNG so a failing game can be replayed. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function shuffled<T>(items: T[], random: () => number) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function findUndefined(value: unknown, path = "root"): string | null {
  if (value === undefined) return path;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const hit = findUndefined(value[i], `${path}[${i}]`);
      if (hit) return hit;
    }
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      const hit = findUndefined(child, `${path}.${key}`);
      if (hit) return hit;
    }
  }
  return null;
}

function newGame(playerCount: number, seed: number, humans: string[] = []) {
  const random = rng(seed);
  const lobby = Array.from({ length: playerCount }, (_, i) => ({
    email: `p${i}`,
    ready: true,
    joinedAt: "0",
    isBot: !humans.includes(`p${i}`),
    gameName: "razzia" as const,
  }));
  return buildGameState(`lobby-${seed}`, lobby, shuffled(buildDeck(), random));
}

function chequesInPlay(state: RazziaGameState) {
  const all = [state.public.money];
  for (const player of state.public.players) all.push(...(player.money || []));
  return all.map(Number).sort((a, b) => a - b);
}

function checkInvariants(
  state: RazziaGameState,
  initialCheques: number[],
  step: number,
) {
  const where = `step ${step}, round ${state.public.round}, ${state.public.roundState}`;
  expect(findUndefined(state), where).toBeNull();
  expect(chequesInPlay(state), where).toEqual(initialCheques);
  expect(state.public.remainingCards, where).toBe(state.private.deck.length);
  // The public tally of revealed cards accounts for every card that left the deck.
  const tallied = Object.values(state.public.revealedCounts || {}).reduce(
    (a, b) => a + b,
    0,
  );
  expect(tallied, where).toBe(120 - state.private.deck.length);
  expect((state.public.revealedCards || []).length, where).toBeLessThanOrEqual(
    7,
  );
  expect(state.public.policeRaids, where).toBeLessThan(state.public.raidLimit);
  expect(state.public.round, where).toBeGreaterThanOrEqual(1);
  expect(state.public.round, where).toBeLessThanOrEqual(3);

  for (const player of state.public.players) {
    const money = player.money || [];
    for (const m of player.availableMoney || []) {
      expect(
        money,
        `${where}: ${player.email} available ${m} not held`,
      ).toContain(m);
    }
    if (!isAuction(state)) {
      expect(player.bid, `${where}: stale bid for ${player.email}`).toBe("0");
    } else if (player.bid !== "0") {
      expect(player.availableMoney, `${where}: bid not from hand`).toContain(
        player.bid,
      );
    }
    for (const card of player.cards?.theives || []) expect(card).toBe("THIEF");
  }

  if (state.public.status === "IN_PROGRESS") {
    const active = getActivePlayer(state);
    expect(active, where).toBeDefined();
    expect(
      (active?.availableMoney || []).length,
      `${where}: active player is broke`,
    ).toBeGreaterThan(0);
    if (isAuction(state)) {
      expect(state.public.auctionTriggeringPlayer, where).toBeDefined();
    }
  }
}

/** A human who plays any legal move at random. */
function randomLegalMove(
  state: RazziaGameState,
  random: () => number,
): BotMove {
  const player = getActivePlayer(state)!;
  const moves: BotMove[] = [];
  if (isAuction(state)) {
    for (const amount of biddableMoney(state, player))
      moves.push({ type: "bid", amount });
    if (canPass(state, player)) moves.push({ type: "pass" });
  } else {
    if (canReveal(state)) moves.push({ type: "reveal" });
    if (canCallAuction(state)) moves.push({ type: "auction" });
    if (canUseThief(state, player)) {
      const table = state.public.revealedCards || [];
      const card = table[Math.floor(random() * table.length)] as LootCards;
      moves.push({ type: "thief", cards: [card] });
    }
  }
  expect(
    moves.length,
    "a player with the turn must have a legal move",
  ).toBeGreaterThan(0);
  return moves[Math.floor(random() * moves.length)];
}

async function playOut(state: RazziaGameState, seed: number, maxSteps = 3000) {
  const random = rng(seed * 7919);
  const initialCheques = chequesInPlay(state);
  let steps = 0;
  const search = { timeoutMs: 25, depth: 4 };

  while (state.public.status !== "GAME_OVER" && steps < maxSteps) {
    const active = getActivePlayer(state)!;
    if (active.isBot) {
      await maybeTakeBotTurn(state, { minimumTurnMs: 0, search });
    } else {
      const move = randomLegalMove(state, random);
      const result = applyBotMove(state, move);
      expect(
        result.ok,
        `human move ${move.type} rejected: ${(result as { reason?: string }).reason}`,
      ).toBe(true);
    }
    steps++;
    checkInvariants(state, initialCheques, steps);
  }

  expect(state.public.status, `game did not finish in ${maxSteps} steps`).toBe(
    "GAME_OVER",
  );
  return steps;
}

function checkFinalState(state: RazziaGameState) {
  const players = state.public.players;
  const scoring = state.public.scoring || [];
  // Three round scorings plus the final one, per player.
  expect(scoring).toHaveLength(players.length * 4);
  for (const player of players) {
    const mine = scoring.filter((s) => s.email === player.email);
    const total = mine.reduce((sum, s) => sum + s.total, 0);
    expect(player.score).toBe(total);
    for (const entry of mine) {
      const sum = Object.values(entry.points).reduce((a, b) => a + b, 0);
      expect(entry.total).toBe(sum);
    }
  }
  expect(state.public.log).toEqual(state.private.log);
  expect((state.public.log || []).length).toBeGreaterThan(20);
  expect(state.public.roundState).toBe("SCORING");
}

describe("full game simulation", () => {
  it.each([
    [3, 1],
    [3, 2],
    [4, 3],
    [4, 4],
    [5, 5],
    [5, 6],
  ])(
    "%i bots finish a game (seed %i)",
    async (playerCount, seed) => {
      const state = newGame(playerCount, seed);
      const steps = await playOut(state, seed);
      checkFinalState(state);
      expect(steps).toBeGreaterThan(30);
    },
    60_000,
  );

  it.each([
    [3, 11],
    [4, 12],
    [5, 13],
  ])(
    "a random human among %i players finishes a game (seed %i)",
    async (playerCount, seed) => {
      const state = newGame(playerCount, seed, ["p1"]);
      await playOut(state, seed);
      checkFinalState(state);
    },
    60_000,
  );

  it("rejects illegal human moves without changing the state", () => {
    const state = newGame(3, 21);
    const before = JSON.stringify(state);
    expect(applyBotMove(state, { type: "bid", amount: "2" }).ok).toBe(false);
    expect(applyBotMove(state, { type: "pass" }).ok).toBe(false);
    expect(applyBotMove(state, { type: "thief", cards: ["COINS"] }).ok).toBe(
      false,
    );
    expect(JSON.stringify(state)).toBe(before);
  });
});
