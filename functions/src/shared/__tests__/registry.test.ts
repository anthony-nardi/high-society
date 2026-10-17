import { describe, expect, it, vi } from "vitest";

vi.mock("../helpers", () => ({
  shuffle: () => undefined,
  updatePlayerLastAction: (player: { lastActionAt: number }) => {
    player.lastActionAt = Date.now();
  },
  updateGameState: vi.fn().mockResolvedValue(undefined),
  getGameName: vi.fn(),
  createGame: vi.fn(),
}));

import { GAMES } from "../registry";
import { GAME_INFO, GAME_NAMES } from "../gameInfo";
import { PlayerInLobby } from "../types";

const lobby = (
  game: PlayerInLobby["gameName"],
  count: number,
): PlayerInLobby[] =>
  Array.from({ length: count }, (_, i) => ({
    email: i === 0 ? "human@example.com" : `Bot #${i}`,
    ready: true,
    joinedAt: "0",
    isBot: i > 0,
    gameName: game,
  }));

describe("game registry", () => {
  it("has a module and info for every game", () => {
    for (const name of GAME_NAMES) {
      expect(GAMES[name].name).toBe(name);
      expect(GAME_INFO[name].minPlayers).toBeLessThanOrEqual(
        GAME_INFO[name].maxPlayers,
      );
      expect(Object.keys(GAMES[name].actions).length).toBeGreaterThan(0);
    }
  });

  it("exposes the callable names the clients use", () => {
    expect(Object.keys(GAMES["high-society"].actions).sort()).toEqual([
      "bid",
      "passturn",
    ]);
    expect(Object.keys(GAMES["no-thanks"].actions).sort()).toEqual([
      "placeChipOnActiveCard",
      "takeActiveCard",
    ]);
    expect(Object.keys(GAMES.razzia.actions).sort()).toEqual([
      "bidOnLoot",
      "initiateAuction",
      "passOnLoot",
      "revealCard",
      "useThief",
    ]);
    expect(Object.keys(GAMES["family-inc"].actions).sort()).toEqual([
      "drawChip",
      "stopTurn",
    ]);
    expect(Object.keys(GAMES.zertz.actions).sort()).toEqual([
      "captureMarble",
      "placeMarble",
      "removeRing",
    ]);
    expect(Object.keys(GAMES.yinsh.actions).sort()).toEqual([
      "moveYinshRing",
      "placeYinshRing",
      "removeYinshRing",
      "removeYinshRow",
    ]);
    expect(Object.keys(GAMES.dvonn.actions).sort()).toEqual([
      "moveDvonnStack",
      "placeDvonnPiece",
    ]);
    expect(Object.keys(GAMES.gipf.actions).sort()).toEqual([
      "pushGipfPiece",
      "removeGipfRow",
    ]);
    expect(Object.keys(GAMES.lyngk.actions).sort()).toEqual([
      "claimLyngkColour",
      "moveLyngkStack",
    ]);
    expect(Object.keys(GAMES["for-sale"].actions).sort()).toEqual([
      "bidForSale",
      "passForSale",
      "sellForSale",
    ]);
    expect(Object.keys(GAMES["shangri-la"].actions).sort()).toEqual([
      "journeyShangriLa",
      "placeShangriLaMaster",
      "recruitShangriLaStudents",
    ]);
    expect(Object.keys(GAMES.acquire.actions).sort()).toEqual([
      "buyAcquireStock",
      "chooseAcquireSurvivor",
      "declareAcquireEnd",
      "disposeAcquireStock",
      "foundAcquireChain",
      "placeAcquireTile",
    ]);
    expect(Object.keys(GAMES.condottiere.actions).sort()).toEqual([
      "chooseCondottiereBattlefield",
      "passCondottiere",
      "playCondottiereCard",
    ]);
    expect(Object.keys(GAMES["ride-the-rails"].actions).sort()).toEqual([
      "buildRideTheRailsTrack",
      "endRideTheRailsBuild",
      "rideTheRails",
      "takeRideTheRailsShare",
    ]);
  });

  it("creates a playable state and lets bots finish from it", () => {
    for (const name of GAME_NAMES) {
      const module = GAMES[name];
      const state = module.createState(
        "lobby-1",
        lobby(name, GAME_INFO[name].minPlayers),
      );
      expect(state.public.game).toBe(name);
      expect(state.public.players).toHaveLength(GAME_INFO[name].minPlayers);
      expect(state.public.status).toBe("IN_PROGRESS");
      expect(module.isGameOver(state)).toBe(false);
      // The human is first; hand the turn to a bot and let it move.
      state.public.activePlayer = state.public.players[1].email;
      const before = JSON.stringify(state);
      module.botTurn(state);
      expect(JSON.stringify(state)).not.toBe(before);
    }
  }, 60_000);

  it("rejects an illegal action without touching the state", () => {
    const state = GAMES["high-society"].createState(
      "lobby-1",
      lobby("high-society", 3),
    );
    const before = JSON.stringify(state);
    const result = GAMES["high-society"].actions.bid(state, { bid: ["99"] });
    expect(result.ok).toBe(false);
    expect(JSON.stringify(state)).toBe(before);
    expect(
      GAMES["no-thanks"].actions.placeChipOnActiveCard(
        {
          ...GAMES["no-thanks"].createState("l", lobby("no-thanks", 3)),
          public: {
            ...GAMES["no-thanks"].createState("l", lobby("no-thanks", 3))
              .public,
            players: [
              {
                email: "human@example.com",
                lastActionAt: 0,
                cards: [],
                chips: 0,
                isBot: false,
              },
            ],
            activePlayer: "human@example.com",
          },
        },
        {},
      ).ok,
    ).toBe(false);
  });
});
