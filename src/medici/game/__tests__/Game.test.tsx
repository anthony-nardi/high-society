import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MediciGameState } from "../types";

const actions = {
  drawMediciCard: vi.fn().mockResolvedValue(true),
  offerMediciLot: vi.fn().mockResolvedValue(true),
  bidMedici: vi.fn().mockResolvedValue(true),
  passMedici: vi.fn().mockResolvedValue(true),
};
let current: MediciGameState;

vi.mock("../../client/mediciActions", () => ({
  drawMediciCard: (r: unknown) => actions.drawMediciCard(r),
  offerMediciLot: (r: unknown) => actions.offerMediciLot(r),
  bidMedici: (r: unknown) => actions.bidMedici(r),
  passMedici: (r: unknown) => actions.passMedici(r),
}));
vi.mock("../../../shared/hooks/useGameState", () => ({
  default: () => ({ gameState: current, isLoading: false }),
}));
vi.mock("../../../shared/context/useUserContext", () => ({
  useUserContext: () => ({
    user: { email: "a@example.com" },
    isSignedIn: true,
  }),
}));
vi.mock("../../../shared/context/useLobbyContext", () => ({
  useLobbyContext: () => ({ lobbyId: 123 }),
}));
vi.mock("../../../shared/hooks/useTurnAlert", () => ({
  default: () => undefined,
}));
vi.mock("../../../shared/hooks/useGameSounds", () => ({
  default: () => undefined,
}));
vi.mock("../../../shared/hooks/useBotNudge", () => ({
  default: () => undefined,
}));

import Game from "..";

const tracks = { CLOTH: 0, SPICE: 0, GRAIN: 0, DYE: 0, FUR: 0 };

const base = (over: Partial<MediciGameState>): MediciGameState => ({
  id: "l",
  game: "medici",
  players: [
    {
      email: "a@example.com",
      lastActionAt: 0,
      isBot: false,
      money: 40,
      tracks: { ...tracks, CLOTH: 2 },
      ship: ["CLOTH_5"],
    },
    {
      email: "Bot #1",
      lastActionAt: 0,
      isBot: true,
      money: 35,
      tracks,
      ship: ["FUR_1", "FUR_2"],
    },
    {
      email: "Bot #2",
      lastActionAt: 0,
      isBot: true,
      money: 40,
      tracks,
    },
  ],
  activePlayer: "a@example.com",
  startAt: "0",
  status: "IN_PROGRESS",
  day: 1,
  phase: "DRAW",
  auctioneer: "a@example.com",
  deckCount: 12,
  capacity: 5,
  turn: 3,
  ...over,
});

afterEach(() => {
  cleanup();
  for (const fn of Object.values(actions)) fn.mockClear();
});

describe("Medici", () => {
  it("lets the auctioneer turn over cards and offer the lot", () => {
    current = base({});
    render(
      <MantineProvider>
        <Game />
      </MantineProvider>,
    );
    expect(screen.getByText("The block is empty.")).toBeTruthy();
    expect(screen.getByTestId("hint").textContent).toContain(
      "turn over at least one card",
    );
    fireEvent.click(screen.getByText("Turn over a card"));
    expect(actions.drawMediciCard).toHaveBeenCalledWith({ lobbyUID: "123" });

    current = base({ lot: ["SPICE_3", "GOLD_10"] });
    cleanup();
    render(
      <MantineProvider>
        <Game />
      </MantineProvider>,
    );
    expect(screen.getByTestId("hint").textContent).toContain(
      "Turn over up to 1 more",
    );
    fireEvent.click(screen.getByText("Offer the lot of 2"));
    expect(actions.offerMediciLot).toHaveBeenCalledWith({ lobbyUID: "123" });
  });

  it("offers quick bids above the high bid and a pass", () => {
    current = base({
      phase: "BID",
      lot: ["SPICE_3", "GOLD_10"],
      auctioneer: "Bot #2",
      highBid: 6,
      highBidder: "Bot #1",
      players: [
        base({}).players[0],
        { ...base({}).players[1], bid: 6 },
        base({}).players[2],
      ],
    });
    render(
      <MantineProvider>
        <Game />
      </MantineProvider>,
    );
    expect(screen.getByTestId("hint").textContent).toContain("Beat 6 florins");
    expect(screen.getByText("Bid 7")).toBeTruthy();
    expect(screen.getByText("Bid 16")).toBeTruthy();
    fireEvent.click(screen.getByText("Bid 8"));
    expect(actions.bidMedici).toHaveBeenCalledWith({
      lobbyUID: "123",
      amount: 8,
    });
    expect(screen.getByTestId("bids").textContent).toContain("Bot 1: 6");
    // A call in flight locks the panel: a fresh screen for the pass.
    cleanup();
    render(
      <MantineProvider>
        <Game />
      </MantineProvider>,
    );
    fireEvent.click(screen.getByText("Pass"));
    expect(actions.passMedici).toHaveBeenCalledWith({ lobbyUID: "123" });
  });

  it("opens the day's ledger the evening it is written", () => {
    current = base({
      day: 2,
      turn: 9,
      activePlayer: "Bot #1",
      auctioneer: "Bot #1",
      dayScoring: {
        day: 1,
        turn: 9,
        ships: [
          { email: "a@example.com", value: 17, pay: 30, cards: ["CLOTH_5"] },
          { email: "Bot #1", value: 12, pay: 15 },
          { email: "Bot #2", value: 3, pay: 0 },
        ],
        tracks: [
          {
            commodity: "CLOTH",
            rows: [
              { email: "a@example.com", level: 2, award: 10, bonus: 0 },
              { email: "Bot #1", level: 0, award: 2, bonus: 0 },
              { email: "Bot #2", level: 0, award: 2, bonus: 0 },
            ],
          },
        ],
        totals: [
          { email: "a@example.com", before: 30, after: 70 },
          { email: "Bot #1", before: 35, after: 52 },
          { email: "Bot #2", before: 40, after: 42 },
        ],
      },
    });
    render(
      <MantineProvider>
        <Game />
      </MantineProvider>,
    );
    expect(screen.getByTestId("ledger")).toBeTruthy();
    expect(screen.getByText("Day 1 is scored: day 2 begins")).toBeTruthy();
    expect(screen.getAllByText("+40").length).toBeGreaterThan(0);
    expect(screen.getByTestId("action-panel").textContent).toContain(
      "Waiting for Bot 1 to make up the lot",
    );
  });
});
