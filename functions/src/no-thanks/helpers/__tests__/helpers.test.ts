import { describe, expect, it } from "vitest";
import {
  getActivePlayer,
  getNextPlayerIndex,
  isGameOver,
  updateActivePlayer,
  updatePlayersGameStateWithPlaceChip,
  updatePlayersGameStateWithTakeActiveCard,
} from "..";
import { gameState, player } from "./fixtures";

describe("taking the active card", () => {
  it("gives the player the card and the chips on it, then reveals the next card", () => {
    const alice = player("alice", { chips: 5 });
    const state = gameState([alice, player("bob")], [20, 7, 33], {
      chipsPlaced: 3,
    });

    updatePlayersGameStateWithTakeActiveCard(state, alice);

    const updatedAlice = state.public.players[0];
    expect(updatedAlice.cards).toEqual([20]);
    expect(updatedAlice.chips).toBe(8);
    expect(updatedAlice.lastActionAt).toBeGreaterThan(0);
    expect(state.public.chipsPlaced).toBe(0);
    expect(state.public.activeCard).toBe(7);
    expect(state.public.remainingCards).toBe(2); // the face-up 7 and the 33
    expect(state.private.deck).toEqual([7, 33]);
  });

  it("keeps the same player active so they take the next decision", () => {
    const alice = player("alice");
    const state = gameState([alice, player("bob")], [20, 7]);

    updatePlayersGameStateWithTakeActiveCard(state, alice);

    expect(state.public.activePlayer).toBe("alice");
  });

  it("ends the game when the last card is taken", () => {
    const alice = player("alice");
    const state = gameState([alice, player("bob")], [20]);

    expect(isGameOver(state)).toBe(false);
    updatePlayersGameStateWithTakeActiveCard(state, alice);

    expect(state.public.activeCard).toBeNull();
    expect(state.public.remainingCards).toBe(0);
    expect(isGameOver(state)).toBe(true);
  });

  it("tolerates players whose card list was dropped by the database", () => {
    const alice = player("alice", { cards: undefined });
    const state = gameState([alice, player("bob")], [20, 7]);

    updatePlayersGameStateWithTakeActiveCard(state, alice);

    expect(state.public.players[0].cards).toEqual([20]);
  });
});

describe("placing a chip", () => {
  it("moves one chip from the player onto the card", () => {
    const alice = player("alice", { chips: 4 });
    const state = gameState([alice, player("bob")], [20, 7], {
      chipsPlaced: 1,
    });

    updatePlayersGameStateWithPlaceChip(state, alice);

    expect(state.public.players[0].chips).toBe(3);
    expect(state.public.chipsPlaced).toBe(2);
    expect(state.public.activeCard).toBe(20);
  });
});

describe("turn order", () => {
  it("advances to the next player and wraps around", () => {
    const state = gameState(
      [player("alice"), player("bob"), player("carol")],
      [20, 7],
    );

    expect(getNextPlayerIndex(state)).toBe(1);
    updateActivePlayer(state);
    expect(state.public.activePlayer).toBe("bob");
    updateActivePlayer(state);
    expect(state.public.activePlayer).toBe("carol");
    updateActivePlayer(state);
    expect(state.public.activePlayer).toBe("alice");
  });

  it("finds the active player's state", () => {
    const state = gameState([player("alice"), player("bob")], [20, 7], {
      activePlayer: "bob",
    });

    expect(getActivePlayer(state)?.email).toBe("bob");
  });
});
