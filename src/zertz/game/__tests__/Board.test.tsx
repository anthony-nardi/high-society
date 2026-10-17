import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import Board from "../components/Board";
import { ZertzGameState } from "../types";
import { ALL_RINGS } from "../board";

afterEach(cleanup);

const state = (over: Partial<ZertzGameState>): ZertzGameState => ({
  id: "l",
  game: "zertz",
  players: [
    {
      email: "a",
      lastActionAt: 0,
      captured: { WHITE: 0, GRAY: 0, BLACK: 0 },
      isBot: false,
    },
    {
      email: "b",
      lastActionAt: 0,
      captured: { WHITE: 0, GRAY: 0, BLACK: 0 },
      isBot: true,
    },
  ],
  activePlayer: "a",
  startAt: "0",
  status: "IN_PROGRESS",
  rings: ALL_RINGS,
  pool: { WHITE: 6, GRAY: 8, BLACK: 10 },
  phase: "MOVE",
  turn: 3,
  ...over,
});

describe("ZÈRTZ board animations", () => {
  it("drops a placed marble in", () => {
    const { container } = render(
      <Board
        gameState={state({
          marbles: { "3,3": "GRAY" },
          lastMove: { type: "place", to: "3,3", colour: "GRAY" },
        })}
        highlights={{}}
      />,
    );
    expect(container.querySelectorAll(".piece-drop")).toHaveLength(1);
    expect(container.querySelectorAll(".piece-lift")).toHaveLength(0);
  });

  it("hops the jumper and lifts the captured marble", () => {
    const { container } = render(
      <Board
        gameState={state({
          marbles: { "3,3": "BLACK" },
          lastMove: {
            type: "capture",
            from: "1,3",
            to: "3,3",
            colour: "WHITE",
          },
        })}
        highlights={{}}
      />,
    );
    const jump = container.querySelector<HTMLElement>(".piece-jump");
    expect(jump?.style.getPropertyValue("--dx")).not.toBe("");
    expect(container.querySelectorAll(".piece-lift")).toHaveLength(1);
  });

  it("lifts a removed ring away", () => {
    const { container } = render(
      <Board
        gameState={state({
          rings: ALL_RINGS.filter((c) => c !== "0,0"),
          lastMove: { type: "remove", from: "0,0" },
        })}
        highlights={{}}
      />,
    );
    expect(container.querySelectorAll(".piece-lift")).toHaveLength(1);
  });
});
