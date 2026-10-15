import { describe, expect, it } from "vitest";
import { makeBestMoveForActivePlayer } from "../simpleBot";
import { gameState, player } from "./fixtures";

const TAKE = 0;
const PLACE_CHIP = 1;

describe("makeBestMoveForActivePlayer", () => {
  it("must take the card when out of chips", () => {
    const state = gameState([player("bot", { chips: 0 }), player("bob")], [35]);
    expect(makeBestMoveForActivePlayer(state)).toBe(TAKE);
  });

  it("places a chip on a high card nobody wants", () => {
    const state = gameState([player("bot"), player("bob")], [35], {
      chipsPlaced: 0,
    });
    expect(makeBestMoveForActivePlayer(state)).toBe(PLACE_CHIP);
  });

  it("takes a card that extends its own run once a couple of chips are on it", () => {
    const state = gameState(
      [player("bot", { cards: [21] }), player("bob")],
      [22],
      { chipsPlaced: 2 }
    );
    expect(makeBestMoveForActivePlayer(state)).toBe(TAKE);
  });

  it("waits for chips before extending its own run", () => {
    const state = gameState(
      [player("bot", { cards: [21] }), player("bob")],
      [22],
      { chipsPlaced: 1 }
    );
    expect(makeBestMoveForActivePlayer(state)).toBe(PLACE_CHIP);
  });

  it("takes a card that would complete an opponent's run if it also extends its own", () => {
    const state = gameState(
      [player("bot", { cards: [21] }), player("bob", { cards: [23] })],
      [22],
      { chipsPlaced: 0 }
    );
    expect(makeBestMoveForActivePlayer(state)).toBe(TAKE);
  });

  it("denies an opponent's run when the card carries at least two chips", () => {
    const state = gameState(
      [player("bot"), player("bob", { cards: [23] })],
      [22],
      { chipsPlaced: 2 }
    );
    expect(makeBestMoveForActivePlayer(state)).toBe(TAKE);
  });

  it("takes any card once enough chips have piled up", () => {
    // card 35 needs floor((35 - 3) / 5) * 2 = 12 chips
    const notEnough = gameState([player("bot"), player("bob")], [35], {
      chipsPlaced: 11,
    });
    const enough = gameState([player("bot"), player("bob")], [35], {
      chipsPlaced: 12,
    });
    expect(makeBestMoveForActivePlayer(notEnough)).toBe(PLACE_CHIP);
    expect(makeBestMoveForActivePlayer(enough)).toBe(TAKE);
  });

  it("throws when the active player cannot be found", () => {
    const state = gameState([player("bot")], [35], { activePlayer: "ghost" });
    expect(() => makeBestMoveForActivePlayer(state)).toThrow(
      "Active player not found"
    );
  });
});
