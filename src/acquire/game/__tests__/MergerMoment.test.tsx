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
    expect(screen.getByText(/You held/)).toBeTruthy();
    cleanup();
    // The bot already sold its Tower: the card still shows the payout as it was.
    const later: AcquireGameState = {
      ...state,
      players: [
        state.players[0],
        { ...state.players[1], stocks: { LUXOR: 2 } },
      ],
      merger: {
        ...(state.merger as NonNullable<AcquireGameState["merger"]>),
        paid: [
          { email: "me@example.com", amount: 2000 },
          { email: "Bot #1", amount: 1500 },
        ],
        holders: [
          { email: "me@example.com", shares: 3 },
          { email: "Bot #1", shares: 1 },
        ],
      },
    };
    render(
      <MantineProvider>
        <MergerMoment gameState={later} me={later.players[0]} />
      </MantineProvider>,
    );
    expect(screen.getByText("+$1,500")).toBeTruthy();
    expect(screen.queryByText(/sole holder/)).toBeNull();
    expect(bonusRank(2000, 200, "TYCOON")).toBe("primary");
    expect(bonusRank(3000, 200, "TYCOON")).toBe("sole holder");
    expect(bonusRank(1500, 200, "TYCOON")).toBe("secondary");
  });
});
