import { cleanup, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { afterEach, describe, expect, it } from "vitest";
import MergerMoment from "../components/MergerMoment";
import { AcquireGameState, Chain } from "../types";
import { bonusRank, CHAINS } from "../board";

afterEach(cleanup);

const chains = (sizes: Partial<{ [c in Chain]: number }>) =>
  Object.fromEntries(
    CHAINS.map((c) => [c, { size: sizes[c] ?? 0, stockLeft: 20 }]),
  ) as AcquireGameState["chains"];

const state: AcquireGameState = {
  id: "l",
  game: "acquire",
  players: [
    {
      email: "me@example.com",
      lastActionAt: 0,
      isBot: false,
      money: 6000,
      stocks: { TOWER: 3 },
    },
    {
      email: "Bot #1",
      lastActionAt: 0,
      isBot: true,
      money: 6000,
      stocks: { TOWER: 1, LUXOR: 2 },
    },
  ],
  activePlayer: "me@example.com",
  turnPlayer: "Bot #1",
  startAt: "0",
  status: "IN_PROGRESS",
  phase: "DISPOSE",
  mode: "TYCOON",
  chains: chains({ LUXOR: 5, TOWER: 2 }),
  merger: {
    tile: "4E",
    survivor: "LUXOR",
    current: "TOWER",
    price: 200,
    queue: ["me@example.com", "Bot #1"],
  },
  bought: 0,
  bagCount: 80,
  turn: 9,
};

describe("the merger moment", () => {
  it("tells who swallows whom, the bonuses and what it means for you", () => {
    render(
      <MantineProvider>
        <MergerMoment gameState={state} me={state.players[0]} />
      </MantineProvider>,
    );
    expect(screen.getByText(/Merger at 4E/)).toBeTruthy();
    expect(screen.getByText(/swallows/)).toBeTruthy();
    // Tower at $200 in Tycoon: 2,000 primary to me, 1,500 secondary to the bot.
    expect(screen.getByText("+$2,000")).toBeTruthy();
    expect(screen.getByText("+$1,500")).toBeTruthy();
    expect(screen.getByText(/You hold/)).toBeTruthy();
    expect(bonusRank(2000, 200, "TYCOON")).toBe("primary");
    expect(bonusRank(3000, 200, "TYCOON")).toBe("sole holder");
    expect(bonusRank(1500, 200, "TYCOON")).toBe("secondary");
  });
});
