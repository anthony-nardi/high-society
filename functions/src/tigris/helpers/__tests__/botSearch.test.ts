import { describe, expect, it } from "vitest";
import { PlayerInLobby } from "../../../shared/types";
import { Colour, TigrisGameState } from "../../types";
import { buildTigrisGameState, placeTile } from "../rules";
import {
  applyMove,
  chooseCommit,
  chooseMove,
  settle,
  turnMoves,
} from "../botSearch";
import { takeBotTurn } from "../bot";

const lobby = (...emails: string[]): PlayerInLobby[] =>
  emails.map((email) => ({
    email,
    ready: true,
    joinedAt: "0",
    isBot: email.startsWith("Bot"),
    gameName: "tigris",
  }));

const fresh = (...emails: string[]) =>
  buildTigrisGameState("lobby", lobby(...emails), () => 0);
const seat = (state: TigrisGameState, email: string) =>
  state.public.players.find((p) => p.email === email)!;
const put = (state: TigrisGameState, cell: string, colour: Colour) => {
  state.public.tiles = { ...(state.public.tiles || {}), [cell]: { colour } };
};
const stand = (
  state: TigrisGameState,
  cell: string,
  email: string,
  colour: Colour,
) => {
  state.public.leaders = {
    ...(state.public.leaders || {}),
    [cell]: { email, colour },
  };
};

describe("the bot", () => {
  it("lists legal actions and picks one that does something", () => {
    const state = fresh("Bot #1", "b");
    const moves = turnMoves(state);
    expect(moves.some((m) => m.type === "LEADER")).toBe(true);
    expect(moves.some((m) => m.type === "TILE")).toBe(true);
    expect(moves.filter((m) => m.type === "CATASTROPHE")).toHaveLength(0); // treasures everywhere
    const before = JSON.stringify(state);
    takeBotTurn(state);
    expect(JSON.stringify(state)).not.toBe(before);
    expect(state.public.status).toBe("IN_PROGRESS");
  });

  it("opens by seating a leader beside a temple", () => {
    const state = fresh("Bot #1", "b");
    const move = chooseMove(state);
    expect(move?.type).toBe("LEADER");
  });

  it("commits just enough to win, and nothing when it cannot", () => {
    const state = fresh("Bot #1", "b");
    state.public.phase = "CONFLICT";
    state.public.conflict = {
      kind: "REVOLT",
      colour: "RED",
      attacker: "b",
      defender: "Bot #1",
      attackerCell: "0_1",
      defenderCell: "2_1",
      attackerBase: 1,
      defenderBase: 1,
      attackerCommit: 2,
      stage: "DEFENDER",
    };
    state.public.activePlayer = "Bot #1";
    expect(chooseCommit(state, "Bot #1", 3)).toBe(2); // a tie holds
    expect(chooseCommit(state, "Bot #1", 1)).toBe(0); // short: keep the temples
  });

  it("fights out a war it starts when weighing a move", () => {
    const state = fresh("Bot #1", "b");
    put(state, "9_0", "RED");
    stand(state, "9_1", "Bot #1", "BLACK");
    put(state, "9_2", "BLACK");
    put(state, "9_4", "RED");
    stand(state, "9_6", "b", "BLACK");
    seat(state, "Bot #1").hand = [
      "BLACK",
      "BLACK",
      "BLACK",
      "BLUE",
      "BLUE",
      "BLUE",
    ];
    seat(state, "b").hand = ["BLUE", "BLUE", "BLUE", "BLUE", "BLUE", "BLUE"];
    const copy = JSON.parse(JSON.stringify(state)) as TigrisGameState;
    expect(placeTile(copy, "9_3", "BLACK").ok).toBe(true);
    expect(copy.public.phase).toBe("CONFLICT");
    settle(copy, "Bot #1");
    expect(copy.public.phase).toBe("ACTION");
    expect(copy.public.lastConflict?.winner).toBe("Bot #1");
    // The real choice is legal too.
    const move = chooseMove(state);
    expect(move).not.toBeNull();
    expect(applyMove(state, move!)?.ok).toBe(true);
  });
});
