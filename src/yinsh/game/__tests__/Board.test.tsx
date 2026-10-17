import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import Board from "../components/Board";
import { YinshGameState } from "../types";

afterEach(cleanup);

const state = (over: Partial<YinshGameState>): YinshGameState => ({
  id: "l",
  game: "yinsh",
  players: [
    { email: "a", lastActionAt: 0, side: "WHITE", scored: 0, isBot: false },
    { email: "b", lastActionAt: 0, side: "BLACK", scored: 0, isBot: true },
  ],
  activePlayer: "b",
  startAt: "0",
  status: "IN_PROGRESS",
  pool: 50,
  phase: "MOVE_RING",
  turn: 12,
  ...over,
});

describe("YINSH board animations", () => {
  it("slides the moved ring, drops the marker it left, and flips what it jumped", () => {
    const { container } = render(
      <Board
        gameState={state({
          rings: { "5,2": "WHITE" },
          markers: { "5,5": "WHITE", "5,4": "BLACK", "5,3": "WHITE" },
          lastMove: { from: "5,5", to: "5,2", flipped: ["5,4", "5,3"] },
        })}
        highlights={{}}
      />,
    );
    const slide = container.querySelector<HTMLElement>(".piece-slide");
    expect(slide?.style.getPropertyValue("--dy")).not.toBe("");
    expect(container.querySelectorAll(".piece-drop")).toHaveLength(1);
    expect(container.querySelectorAll(".piece-flip-out")).toHaveLength(2);
    expect(container.querySelectorAll(".piece-flip-in")).toHaveLength(2);
  });

  it("drops a placed ring in during setup", () => {
    const { container } = render(
      <Board
        gameState={state({
          phase: "PLACE_RINGS",
          rings: { "5,5": "WHITE" },
          lastMove: { to: "5,5" },
        })}
        highlights={{}}
      />,
    );
    expect(container.querySelectorAll(".piece-drop")).toHaveLength(1);
    expect(container.querySelectorAll(".piece-slide")).toHaveLength(0);
  });

  it("lifts the removed row and the scored ring", () => {
    const { container } = render(
      <Board
        gameState={state({
          phase: "MOVE_RING",
          rings: {},
          markers: {},
          lastMove: {
            from: "6,5",
            to: "7,5",
            removed: ["1,5", "2,5", "3,5", "4,5", "5,5"],
            removedBy: "WHITE",
            removedRing: "7,5",
          },
        })}
        highlights={{}}
      />,
    );
    expect(container.querySelectorAll(".piece-lift")).toHaveLength(6);
  });
});
