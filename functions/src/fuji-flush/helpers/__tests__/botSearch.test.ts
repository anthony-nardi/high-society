import { describe, expect, it } from "vitest";
import { PlayerInLobby } from "../../../shared/types";
import { FujiFlushGameState } from "../../types";
import { buildFujiFlushGameState } from "../rules";
import { chooseCard, judge, turnMoves } from "../botSearch";
import { takeBotTurn } from "../bot";

const lobby = (...emails: string[]): PlayerInLobby[] =>
  emails.map((email) => ({
    email,
    ready: true,
    joinedAt: "0",
    isBot: email.startsWith("Bot"),
    gameName: "fuji-flush",
  }));

const seat = (state: FujiFlushGameState, email: string) =>
  state.public.players.find((p) => p.email === email)!;

/** The bot in seat one is up, b and c follow. */
function table(
  bot: number[],
  b: { hand: number[]; played?: number },
  c: { hand: number[]; played?: number },
) {
  const state = buildFujiFlushGameState(
    "l",
    lobby("Bot #1", "b", "c"),
    () => 0,
  );
  state.public.activePlayer = "Bot #1";
  seat(state, "Bot #1").hand = bot;
  seat(state, "b").hand = b.hand;
  if (b.played !== undefined) seat(state, "b").played = b.played;
  seat(state, "c").hand = c.hand;
  if (c.played !== undefined) seat(state, "c").played = c.played;
  return state;
}

describe("the bot", () => {
  it("lists each distinct card once", () => {
    const state = table([2, 2, 7], { hand: [3] }, { hand: [3] });
    expect(turnMoves(state)).toEqual([{ card: 2 }, { card: 7 }]);
  });

  it("flushes a player on their last card when it can", () => {
    const state = table(
      [3, 12, 20],
      { hand: [], played: 9 },
      { hand: [2, 2], played: 4 },
    );
    expect([12, 20]).toContain(chooseCard(state));
    expect(judge(state).find((j) => j.card === 3)!.score).toBeLessThan(
      judge(state).find((j) => j.card === 12)!.score,
    );
  });

  it("spends its lowest card when nothing can survive", () => {
    const state = table(
      [2, 5, 6],
      { hand: [2, 2, 2], played: 20 },
      { hand: [2, 2], played: 15 },
    );
    expect(chooseCard(state)).toBe(2);
  });

  it("would rather beat a leader than join them for the win", () => {
    const state = table(
      [7, 9],
      { hand: [], played: 7 },
      { hand: [2, 2, 2], played: 3 },
    );
    expect(chooseCard(state)).toBe(9);
  });

  it("plays a card in place", () => {
    const state = table([4, 8], { hand: [3] }, { hand: [3] });
    takeBotTurn(state);
    expect(seat(state, "Bot #1").played).toBeDefined();
    expect(seat(state, "Bot #1").hand).toHaveLength(1);
    expect(state.public.activePlayer).toBe("b");
  });
});
