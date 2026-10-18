import { beforeEach, describe, expect, it, vi } from "vitest";

const update = vi.fn().mockResolvedValue(undefined);
vi.mock("firebase-admin/database", () => ({
  getDatabase: () => ({ ref: () => ({ update }) }),
  ServerValue: { increment: (n: number) => ({ increment: n }) },
}));
vi.mock("../helpers", () => ({
  shuffle: (array: unknown[]) => array.sort(() => Math.random() - 0.5),
  updatePlayerLastAction: (player: { lastActionAt: number }) => {
    player.lastActionAt = Date.now();
  },
  updateGameState: vi.fn().mockResolvedValue(undefined),
  getGameName: vi.fn(),
  createGame: vi.fn(),
}));

import { placements, recordGameStats, statsKey } from "../stats";
import { GAMES } from "../registry";
import { GAME_INFO, GAME_NAMES } from "../gameInfo";
import { GameModule } from "../game";
import { GenericGameState, PlayerInLobby } from "../types";

const human = "anthony.gt@example.com";
const lobby = (
  game: PlayerInLobby["gameName"],
  count: number,
): PlayerInLobby[] =>
  Array.from({ length: count }, (_, i) => ({
    email: i === 0 ? human : `Bot #${i}`,
    ready: true,
    joinedAt: "0",
    isBot: i > 0,
    gameName: game,
  }));

describe("statistics", () => {
  beforeEach(() => update.mockClear());

  it("keys players by a database-safe email", () => {
    expect(statsKey(human)).toBe("anthony,gt@example,com");
    expect(statsKey("a#b$c/d[e]")).toBe("a_b_c_d_e_");
  });

  it("ranks standings with ties sharing a place, and winner-first without them", () => {
    const module = {
      standings: () => [
        { email: "a", score: 5 },
        { email: "b", score: 9 },
        { email: "c", score: 5 },
        { email: "d", score: 1 },
      ],
    } as unknown as GameModule<GenericGameState>;
    const state = {
      public: { players: ["a", "b", "c", "d"].map((email) => ({ email })) },
    } as unknown as GenericGameState;
    expect(placements(module, state).map((p) => `${p.email}${p.rank}`)).toEqual(
      ["b1", "a2", "c2", "d4"],
    );
    const plain = {} as GameModule<GenericGameState>;
    const two = {
      public: {
        winner: "x",
        players: [{ email: "x" }, { email: "y" }],
      },
    } as unknown as GenericGameState;
    expect(placements(plain, two).map((p) => `${p.email}${p.rank}`)).toEqual([
      "x1",
      "y2",
    ]);
    // Players the standings leave out come last.
    const partial = {
      standings: () => [{ email: "a", score: 1 }],
    } as unknown as GameModule<GenericGameState>;
    const three = {
      public: { players: [{ email: "a" }, { email: "b" }] },
    } as unknown as GenericGameState;
    expect(
      placements(partial, three).map((p) => `${p.email}${p.rank}`),
    ).toEqual(["a1", "b2"]);
  });

  it("records a finished game of every kind once, for humans only", async () => {
    for (const name of GAME_NAMES) {
      const module = GAMES[name];
      const state = module.createState(
        `lobby-${name}`,
        lobby(name, GAME_INFO[name].minPlayers),
      ) as GenericGameState & { public: { winner?: string } };
      state.public.status = "GAME_OVER";
      state.public.winner = human;
      update.mockClear();
      await recordGameStats(module, state);
      expect(update).toHaveBeenCalledTimes(1);
      const writes = update.mock.calls[0][0] as { [path: string]: unknown };
      const paths = Object.keys(writes);
      expect(paths.some((p) => p.includes("Bot"))).toBe(false);
      expect(
        writes[`stats/players/anthony,gt@example,com/games/${name}/played`],
      ).toEqual({ increment: 1 });
      expect(paths.some((p) => p.includes(`/games/${name}/places/`))).toBe(
        true,
      );
      expect(writes[`stats/games/${name}/played`]).toEqual({ increment: 1 });
      // A second call is a no-op: the state remembers it was recorded.
      await recordGameStats(module, state);
      expect(update).toHaveBeenCalledTimes(1);
    }
  });

  it("places a real finished game by its standings", () => {
    const module = GAMES["no-thanks"];
    const state = module.createState("l", lobby("no-thanks", 3));
    let steps = 0;
    for (const p of state.public.players) p.isBot = true;
    while (!module.isGameOver(state) && steps++ < 500) module.botTurn(state);
    expect(module.isGameOver(state)).toBe(true);
    const places = placements(module, state);
    expect(places).toHaveLength(3);
    expect(places[0].rank).toBe(1);
  });
});
