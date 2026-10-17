import { describe, expect, it, vi } from "vitest";
import { buildDvonnGameState, piecesPlaced, scores } from "../rules";
import { chooseBotMove, evaluate, turnMoves } from "../botSearch";
import { maybeTakeBotTurn } from "../bot";
import { Piece } from "../../types";

vi.mock("../../../shared/helpers", () => ({
  updateGameState: vi.fn().mockResolvedValue(undefined),
}));

const lobby = (...emails: string[]) =>
  emails.map((email) => ({
    email,
    ready: true,
    joinedAt: "0",
    isBot: email.startsWith("Bot"),
    gameName: "dvonn" as const,
  }));

const search = { timeoutMs: 150, depth: 2 };

describe("placement", () => {
  it("puts the first DVONN piece near the middle and the next ones apart", () => {
    const state = buildDvonnGameState("l", lobby("Bot #1", "Bot #2"), () => 0);
    const first = chooseBotMove(state, search);
    expect(first).toMatchObject({ kind: "place" });
    if (first?.kind !== "place") return;
    expect(["5,2", "4,2", "6,2", "5,1", "4,3", "5,3", "6,1"]).toContain(
      first.coord,
    );
    state.public.stacks = { [first.coord]: ["DVONN"] };
    state.public.players[0].dvonn = 1;
    state.public.activePlayer = "Bot #2";
    const second = chooseBotMove(state, search);
    if (second?.kind !== "place") throw new Error("expected a placement");
    expect(second.coord).not.toBe(first.coord);
  });

  it("prefers a space next to a DVONN piece for its own pieces", () => {
    const state = buildDvonnGameState("l", lobby("Bot #1", "b"), () => 0);
    state.public.stacks = {
      "5,2": ["DVONN"],
      "2,0": ["DVONN"],
      "8,4": ["DVONN"],
    };
    state.public.players[0].dvonn = 0;
    state.public.players[1].dvonn = 0;
    const move = chooseBotMove(state, search);
    if (move?.kind !== "place") throw new Error("expected a placement");
    expect(["4,2", "6,2", "5,1", "6,1", "4,3", "5,3"]).toContain(move.coord);
  });
});

describe("evaluation", () => {
  it("prefers controlling more pieces", () => {
    const state = buildDvonnGameState("l", lobby("Bot #1", "b"), () => 0);
    state.public.phase = "MOVE";
    state.public.stacks = {
      "2,2": ["DVONN"],
      "3,2": ["BLACK", "WHITE", "WHITE"],
      "4,2": ["BLACK"],
    };
    expect(evaluate(state, "Bot #1")).toBeGreaterThan(evaluate(state, "b"));
  });
});

describe("chooseBotMove", () => {
  it("takes a move that cuts the opponent off", () => {
    const state = buildDvonnGameState("l", lobby("Bot #1", "b"), () => 0);
    state.public.phase = "MOVE";
    const stacks: { [c: string]: Piece[] } = {
      "2,2": ["DVONN"],
      "3,2": ["WHITE"],
      "4,2": ["BLACK"],
      "5,2": ["BLACK"],
      "6,2": ["BLACK"],
    };
    state.public.stacks = stacks;
    const move = chooseBotMove(state, search);
    // Moving 3,2 onto 2,2 strands the three black pieces east of it; onto 4,2 keeps them.
    expect(move).toMatchObject({ kind: "move", from: "3,2", to: "2,2" });
  });

  it("plays a whole game of bots to the end", async () => {
    const state = buildDvonnGameState("l", lobby("Bot #1", "Bot #2"), () => 0);
    let steps = 0;
    while (state.public.status !== "GAME_OVER" && steps < 400) {
      await maybeTakeBotTurn(state, {
        minimumTurnMs: 0,
        search: { timeoutMs: 40, depth: 2 },
      });
      steps++;
      if (state.public.phase === "PLACE") {
        expect(turnMoves(state).length).toBeGreaterThan(0);
      }
    }
    expect(piecesPlaced(state)).toBeLessThanOrEqual(49);
    expect(state.public.status).toBe("GAME_OVER");
    const totals = scores(state);
    expect(state.public.scores).toEqual(totals);
    expect(state.public.winner || state.public.draw).toBeTruthy();
    // Every DVONN piece is still on the board.
    const reds = Object.values(state.public.stacks || {})
      .flat()
      .filter((p) => p === "DVONN");
    expect(reds).toHaveLength(3);
  }, 180_000);
});
