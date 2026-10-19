import { describe, expect, it } from "vitest";
import { PlayerInLobby } from "../../../shared/types";
import { PushGameState } from "../../types";
import {
  bankColour,
  buildPushGameState,
  drawCard,
  placeCard,
  scoreOf,
  takeColumn,
} from "../rules";
import { canPlace, fullDeck, placements } from "../board";
import {
  chooseBotMove,
  columnWorth,
  drawValue,
  stopValue,
  turnMoves,
} from "../botSearch";
import { takeBotTurn } from "../bot";

const lobby = (...emails: string[]): PlayerInLobby[] =>
  emails.map((email) => ({
    email,
    ready: true,
    joinedAt: "0",
    isBot: email.startsWith("Bot"),
    gameName: "push",
  }));

/** A game whose first player is the first seat and whose deck is in a known order. */
function fresh(deck: string[], ...emails: string[]) {
  const state = buildPushGameState("l", lobby(...emails), () => 0);
  state.private.deck = [...deck];
  state.public.deckCount = deck.length;
  return state;
}

function player(state: PushGameState, email: string) {
  return state.public.players.find((p) => p.email === email)!;
}

/** A die that always shows the given face: the faces are RED, BLUE, YELLOW, GREEN, PURPLE, STAR. */
const die = (index: number) => () => (index + 0.5) / 6;

describe("the deck and the columns", () => {
  it("has 120 cards, 108 with two players, and keeps a column free of repeats", () => {
    expect(fullDeck(3)).toHaveLength(120);
    expect(fullDeck(3).filter((c) => c === "SWITCH")).toHaveLength(12);
    expect(fullDeck(3).filter((c) => c === "DICE")).toHaveLength(18);
    expect(fullDeck(2)).toHaveLength(108);
    expect(canPlace(["RED_2", "BLUE_5"], "YELLOW_2")).toBe(false);
    expect(canPlace(["RED_2", "BLUE_5"], "BLUE_3")).toBe(false);
    expect(canPlace(["RED_2", "BLUE_5"], "YELLOW_3")).toBe(true);
    expect(canPlace(["RED_2", "DICE"], "DICE")).toBe(false);
    expect(canPlace(["RED_2"], "DICE")).toBe(true);
    expect(placements([["RED_2"], ["BLUE_2"]], "GREEN_2")).toEqual([2]);
    expect(
      placements([["RED_2"], ["BLUE_2"], ["YELLOW_2"]], "GREEN_2"),
    ).toEqual([]);
  });
});

describe("pushing", () => {
  it("places where it must, asks when there is a choice, and stops by taking a column", () => {
    const state = fresh(
      ["RED_2", "BLUE_5", "RED_6", "GREEN_1", "YELLOW_4"],
      "a",
      "b",
      "c",
    );
    expect(takeColumn(state, 0).ok).toBe(false);
    expect(drawCard(state).ok).toBe(true);
    // The first card can only start a column.
    expect(state.public.columns).toEqual([["RED_2"]]);
    expect(state.public.pending).toBeUndefined();
    drawCard(state);
    // Blue 5 could join or start: the player chooses.
    expect(state.public.pending).toBe("BLUE_5");
    expect(drawCard(state).ok).toBe(false);
    expect(placeCard(state, 2).ok).toBe(false);
    expect(placeCard(state, 0).ok).toBe(true);
    expect(state.public.columns).toEqual([["RED_2", "BLUE_5"]]);
    drawCard(state); // RED_6 cannot join column 1: starts column 2.
    expect(state.public.columns).toEqual([["RED_2", "BLUE_5"], ["RED_6"]]);
    expect(bankColour(state, "RED").ok).toBe(false);
    expect(takeColumn(state, 0).ok).toBe(true);
    expect(player(state, "a").bench).toEqual(["RED_2", "BLUE_5"]);
    // b, on a's left, chooses; the one column left goes to b; c gets nothing.
    expect(state.public.phase).toBe("CHOOSE");
    expect(state.public.activePlayer).toBe("b");
    expect(takeColumn(state, 1).ok).toBe(false);
    expect(takeColumn(state, 0).ok).toBe(true);
    expect(player(state, "b").bench).toEqual(["RED_6"]);
    expect(state.public.phase).toBe("PUSH");
    expect(state.public.turnPlayer).toBe("b");
    expect(state.public.activePlayer).toBe("b");
    expect(state.public.turn).toBe(1);
  });

  it("busts on a card that fits nowhere: a roll, no column, and the others choose", () => {
    const state = fresh(
      ["RED_2", "BLUE_2", "YELLOW_2", "GREEN_2", "PURPLE_1"],
      "a",
      "b",
      "c",
    );
    player(state, "a").bench = ["GREEN_5", "GREEN_3", "RED_1"];
    drawCard(state);
    drawCard(state);
    placeCard(state, 1);
    drawCard(state);
    placeCard(state, 2);
    expect(state.public.columns).toEqual([["RED_2"], ["BLUE_2"], ["YELLOW_2"]]);
    // Green 2 fits nowhere: the die shows green.
    expect(drawCard(state, die(3)).ok).toBe(true);
    expect(state.public.lastRoll).toMatchObject({
      email: "a",
      face: "GREEN",
      reason: "BUST",
      card: "GREEN_2",
      lost: ["GREEN_5", "GREEN_3"],
    });
    expect(player(state, "a").bench).toEqual(["RED_1"]);
    expect(state.public.phase).toBe("CHOOSE");
    expect(state.public.activePlayer).toBe("b");
    takeColumn(state, 0);
    expect(state.public.activePlayer).toBe("c");
    takeColumn(state, 0);
    // Three columns, two choosers: the last is discarded.
    expect(state.public.columns).toBeUndefined();
    expect(state.private.discard).toContain("YELLOW_2");
    expect(state.public.turnPlayer).toBe("b");
  });

  it("rolls for a dice card after the cards join the zone, and the star spares everything", () => {
    const state = fresh(["BLUE_4", "DICE", "RED_1"], "a", "b");
    player(state, "a").bench = ["BLUE_6"];
    drawCard(state);
    drawCard(state);
    placeCard(state, 0);
    expect(state.public.columns).toEqual([["BLUE_4", "DICE"]]);
    takeColumn(state, 0, die(1)); // blue
    expect(player(state, "a").bench).toBeUndefined();
    expect(state.public.lastRoll).toMatchObject({
      face: "BLUE",
      reason: "DICE",
      lost: ["BLUE_6", "BLUE_4"],
    });
    expect(state.private.discard).toContain("DICE");
    // b has nothing left to choose from: b's turn.
    expect(state.public.turnPlayer).toBe("b");
    drawCard(state); // RED_1, the last card: b must stop.
    expect(drawCard(state).ok).toBe(false);
    takeColumn(state, 0, die(5));
    expect(state.public.lastRoll?.face).toBe("BLUE");
    expect(state.public.status).toBe("GAME_OVER");
    expect(state.public.winner).toBe("b");
  });

  it("protects a colour instead of pushing, and the die cannot reach it", () => {
    const state = fresh(["DICE", "RED_1", "BLUE_1"], "a", "b");
    player(state, "a").bench = ["RED_5", "RED_3", "BLUE_2"];
    expect(bankColour(state, "GREEN").ok).toBe(false);
    expect(bankColour(state, "RED").ok).toBe(true);
    expect(player(state, "a").bench).toEqual(["BLUE_2"]);
    expect(player(state, "a").bank).toEqual(["RED_5", "RED_3"]);
    expect(state.public.turnPlayer).toBe("b");
    drawCard(state); // DICE starts a column
    takeColumn(state, 0, die(0)); // b rolls red, has nothing
    expect(state.public.lastRoll).toMatchObject({ email: "b", face: "RED" });
    expect(state.public.turnPlayer).toBe("a");
    expect(scoreOf(player(state, "a"))).toBe(10);
  });

  it("lets the others choose from the right after one switch, from the left after two", () => {
    const state = fresh(
      ["SWITCH", "RED_1", "SWITCH", "SWITCH", "BLUE_1", "GREEN_1"],
      "a",
      "b",
      "c",
      "d",
    );
    drawCard(state);
    expect(state.public.switches).toBe(1);
    expect(state.public.columns).toBeUndefined();
    drawCard(state);
    takeColumn(state, 0);
    // One switch: d, on a's right, chooses first, but there is nothing left.
    expect(state.public.turnPlayer).toBe("b");
    drawCard(state); // switch
    drawCard(state); // switch
    drawCard(state); // BLUE_1
    drawCard(state); // GREEN_1: column 1 or 2
    placeCard(state, 1);
    takeColumn(state, 0);
    expect(state.public.activePlayer).toBe("c");
    expect(state.public.choosers).toEqual(["d", "a"]);
  });
});

describe("the bot", () => {
  it("values a column by its points less the dice risk and stops when the deck turns against it", () => {
    expect(columnWorth(["RED_6", "BLUE_5"], [])).toBe(11);
    expect(columnWorth(["RED_6", "DICE"], ["RED_6", "GREEN_3"])).toBeCloseTo(
      6 - 15 / 6,
    );
    const state = fresh(["RED_2"], "Bot #1", "b", "c");
    state.public.columns = [["RED_6"], ["BLUE_6"], ["YELLOW_6"]];
    state.public.drawn = 3;
    const me = player(state, "Bot #1");
    // If only Green 6 were left to draw it would fit nowhere: a sure bust.
    expect(
      drawValue(state, me, state.public.columns, ["GREEN_6"]),
    ).toBeLessThan(stopValue(state, me, state.public.columns));
    expect(turnMoves(state).map((m) => m.type)).toEqual([
      "draw",
      "take",
      "take",
      "take",
    ]);
    // Three full columns: almost every card in the deck would bust, so the bot stops.
    state.public.columns = [
      ["RED_6", "BLUE_5", "YELLOW_4"],
      ["GREEN_6", "PURPLE_5", "RED_4"],
      ["BLUE_6", "YELLOW_5", "GREEN_4"],
    ];
    expect(chooseBotMove(state, () => 0.5)).toEqual({
      type: "take",
      column: 0,
    });
  });

  it("keeps drawing into an empty table and always makes progress", () => {
    const state = buildPushGameState("l", lobby("Bot #1", "b", "Bot #3"));
    expect(chooseBotMove(state)).toEqual({ type: "draw" });
    let guard = 0;
    while (state.public.status === "IN_PROGRESS" && guard++ < 3000) {
      const before = JSON.stringify(state);
      const active = state.public.players.find(
        (p) => p.email === state.public.activePlayer,
      )!;
      if (active.isBot) takeBotTurn(state);
      else {
        const pub = state.public;
        if (pub.phase === "CHOOSE") takeColumn(state, 0);
        else if (pub.pending)
          placeCard(state, placements(pub.columns || [], pub.pending)[0]);
        else if ((pub.columns || []).length) takeColumn(state, 0);
        else drawCard(state);
      }
      expect(JSON.stringify(state)).not.toBe(before);
    }
    expect(state.public.status).toBe("GAME_OVER");
    expect(state.public.deckCount).toBe(0);
  });
});
