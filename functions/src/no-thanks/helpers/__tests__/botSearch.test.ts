import { describe, expect, it, vi } from "vitest";

// shared/helpers imports the game helpers back (to create games), so the
// mock is written out in full rather than spreading the original.
vi.mock("../../../shared/helpers", () => ({
  shuffle: () => undefined,
  updatePlayerLastAction: (player: { lastActionAt: number }) => {
    player.lastActionAt = Date.now();
  },
  updateGameState: vi.fn().mockResolvedValue(undefined),
  getGameName: vi.fn(),
  createGame: vi.fn(),
}));

import {
  applyMove,
  candidateMoves,
  cardPoints,
  chooseBotMove,
  evaluate,
  toCardState,
} from "../botSearch";
import { maybeTakeBotTurn } from "../bot";
import { gameState, player } from "./fixtures";

const search = { timeoutMs: 300, depth: 10 };

describe("cardPoints", () => {
  it("counts only the lowest card of each run", () => {
    expect(cardPoints([])).toBe(0);
    expect(cardPoints([5, 6, 7, 20, 22, 23])).toBe(5 + 20 + 22);
  });
});

describe("card simulation", () => {
  it("converts the stored game state", () => {
    const state = toCardState(
      gameState(
        [player("alice", { cards: [9] }), player("bot", { chips: 4 })],
        [10, 30],
        {
          chipsPlaced: 2,
          activePlayer: "bot",
        },
      ),
    );
    expect(state.activePlayer).toBe(1);
    expect(state.card).toBe(10);
    expect(state.chipsPlaced).toBe(2);
    expect(state.players[0].cards).toEqual([9]);
  });

  it("moves a chip from the player onto the card and passes the turn", () => {
    const state = toCardState(gameState([player("a"), player("b")], [20]));
    const next = applyMove(state, "chip");
    expect(next.players[0].chips).toBe(10);
    expect(next.chipsPlaced).toBe(1);
    expect(next.activePlayer).toBe(1);
    expect(next.resolved).toBe(false);
    expect(state.players[0].chips).toBe(11);
  });

  it("gives the card and the chips to whoever takes it", () => {
    const state = toCardState(
      gameState([player("a"), player("b")], [20], { chipsPlaced: 3 }),
    );
    const next = applyMove(state, "take");
    expect(next.players[0].cards).toEqual([20]);
    expect(next.players[0].chips).toBe(14);
    expect(next.chipsPlaced).toBe(0);
    expect(next.resolved).toBe(true);
  });

  it("only offers a chip to players who have one", () => {
    expect(candidateMoves(toCardState(gameState([player("a")], [20])))).toEqual(
      ["take", "chip"],
    );
    expect(
      candidateMoves(toCardState(gameState([player("a", { chips: 0 })], [20]))),
    ).toEqual(["take"]);
  });
});

describe("evaluation", () => {
  it("prefers fewer points and more chips", () => {
    const state = toCardState(
      gameState(
        [
          player("light", { cards: [5], chips: 8 }),
          player("heavy", { cards: [30], chips: 2 }),
        ],
        [20],
      ),
    );
    state.resolved = true;
    const [light, heavy] = evaluate(state);
    expect(light).toBeGreaterThan(heavy);
  });

  it("treats a card that joins a run as nearly free", () => {
    const base = gameState(
      [player("a", { cards: [21, 22] }), player("b")],
      [20],
    );
    const joined = toCardState(base);
    joined.players[0].cards.push(20);
    joined.resolved = true;
    const alone = toCardState(base);
    alone.players[0].cards.push(30);
    alone.resolved = true;
    expect(evaluate(joined)[0]).toBeGreaterThan(evaluate(alone)[0]);
  });
});

describe("chooseBotMove", () => {
  it("places a chip on a high card nobody wants", () => {
    const state = gameState(
      [player("bot", { isBot: true }), player("a"), player("b")],
      [35, 20, 10],
    );
    expect(chooseBotMove(state, search)).toBe("chip");
  });

  it("takes a card that extends its run when an opponent would otherwise grab it", () => {
    // Bob has no chips left, so passing the 22 on hands it to him for free.
    const state = gameState(
      [
        player("bot", { isBot: true, cards: [21] }),
        player("bob", { chips: 0 }),
      ],
      [22, 30, 10],
      { chipsPlaced: 3 },
    );
    expect(chooseBotMove(state, search)).toBe("take");
  });

  it("keeps a free card going round while opponents still pay chips", () => {
    // 22 joins the bot's run, so letting it circle collects more chips.
    const state = gameState(
      [player("bot", { isBot: true, cards: [21] }), player("a"), player("b")],
      [22, 30, 10],
      { chipsPlaced: 3 },
    );
    expect(chooseBotMove(state, search)).toBe("chip");
  });

  it("takes a cheap card with a pile of chips on it", () => {
    const state = gameState(
      [player("bot", { isBot: true }), player("a"), player("b")],
      [5, 30, 10],
      { chipsPlaced: 7 },
    );
    expect(chooseBotMove(state, search)).toBe("take");
  });

  it("must take when it has no chips", () => {
    const state = gameState(
      [player("bot", { isBot: true, chips: 0 }), player("a"), player("b")],
      [35, 20, 10],
    );
    expect(chooseBotMove(state, search)).toBe("take");
  });
});

describe("maybeTakeBotTurn", () => {
  it("does nothing for a human player", async () => {
    const state = gameState([player("alice"), player("bob")], [35, 20]);
    await maybeTakeBotTurn(state, { minimumTurnMs: 0, search });
    expect(state.public.activePlayer).toBe("alice");
    expect(state.public.chipsPlaced).toBe(0);
  });

  it("applies the searched move and logs it", async () => {
    const state = gameState(
      [player("bot", { isBot: true }), player("alice"), player("bob")],
      [35, 20, 10],
    );
    await maybeTakeBotTurn(state, { minimumTurnMs: 0, search });
    expect(state.public.chipsPlaced).toBe(1);
    expect(state.public.players[0].chips).toBe(10);
    expect(state.public.activePlayer).toBe("alice");
    expect(state.private.log?.map((entry) => entry.title)).toEqual([
      "bot has placed a chip on 35.",
    ]);
  });
});
