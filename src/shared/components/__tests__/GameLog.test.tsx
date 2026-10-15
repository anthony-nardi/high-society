import { MantineProvider } from "@mantine/core";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import GameLog from "../GameLog";

afterEach(cleanup);

describe("GameLog", () => {
  it("lists every entry with elapsed time and display names", () => {
    render(
      <MantineProvider>
        <GameLog
          log={[
            { timestamp: 1000, title: "Game started. 7 revealed." },
            { timestamp: 66000, title: "alice@example.com has highest bid of 10." },
            {
              timestamp: 70000,
              title: "Bot #1 passes and receives -5.",
              message: "2x was revealed. Game over.",
            },
          ]}
        />
      </MantineProvider>
    );

    expect(screen.getByText("Game started. 7 revealed.")).toBeTruthy();
    expect(screen.getByText("alice has highest bid of 10.")).toBeTruthy();
    expect(screen.getByText("Bot 1 passes and receives -5.")).toBeTruthy();
    expect(screen.getByText("2x was revealed. Game over.")).toBeTruthy();
    expect(screen.getByText("1:05")).toBeTruthy();
  });

  it("renders nothing for an empty log", () => {
    render(
      <MantineProvider>
        <GameLog log={[]} />
      </MantineProvider>
    );
    expect(screen.queryByTestId("game-log")).toBeNull();
    expect(screen.queryByText("Game log")).toBeNull();
  });
});
