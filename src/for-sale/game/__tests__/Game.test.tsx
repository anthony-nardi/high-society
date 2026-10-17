import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ForSaleGameState } from "../types";

const bidForSale = vi.fn().mockResolvedValue(true);
const passForSale = vi.fn().mockResolvedValue(true);
const sellForSale = vi.fn().mockResolvedValue(true);
let current: ForSaleGameState;

vi.mock("../../client/bidForSale", () => ({
  default: (r: unknown) => bidForSale(r),
}));
vi.mock("../../client/passForSale", () => ({
  default: (r: unknown) => passForSale(r),
}));
vi.mock("../../client/sellForSale", () => ({
  default: (r: unknown) => sellForSale(r),
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

const base = (over: Partial<ForSaleGameState>): ForSaleGameState => ({
  id: "l",
  game: "for-sale",
  players: [
    {
      email: "a@example.com",
      lastActionAt: 0,
      money: 18,
      bid: 0,
      isBot: false,
      properties: [7, 22],
    },
    {
      email: "Bot #1",
      lastActionAt: 0,
      money: 16,
      bid: 3,
      isBot: true,
      properties: [3],
    },
    {
      email: "Bot #2",
      lastActionAt: 0,
      money: 18,
      bid: 0,
      isBot: true,
      passed: true,
      properties: [1],
    },
  ],
  activePlayer: "a@example.com",
  startAt: "0",
  status: "IN_PROGRESS",
  phase: "BUYING",
  round: 2,
  onOffer: [12, 28],
  highBid: 3,
  highBidder: "Bot #1",
  starting: "a@example.com",
  propertiesLeft: 18,
  chequesLeft: 24,
  ...over,
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const renderGame = () =>
  render(
    <MantineProvider>
      <Game />
    </MantineProvider>,
  );

describe("For Sale table", () => {
  it("offers raises over the standing bid and a priced pass", () => {
    current = base({});
    renderGame();
    expect(screen.getByText(/holds the high bid at \$3,000/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Bid $5,000" }));
    expect(bidForSale).toHaveBeenCalledWith({ lobbyUID: "123", amount: 5 });
  });

  it("passes for free when you have not bid", () => {
    current = base({});
    renderGame();
    fireEvent.click(
      screen.getByRole("button", { name: /Pass: take #12 free/ }),
    );
    expect(passForSale).toHaveBeenCalledWith({ lobbyUID: "123" });
  });

  it("prices the pass at half your own bid, rounded up", () => {
    current = base({
      players: [
        {
          email: "a@example.com",
          lastActionAt: 0,
          money: 18,
          bid: 3,
          isBot: false,
        },
        { email: "Bot #1", lastActionAt: 0, money: 16, bid: 4, isBot: true },
        { email: "Bot #2", lastActionAt: 0, money: 18, bid: 0, isBot: true },
      ],
      onOffer: [2, 12, 28],
      highBid: 4,
    });
    renderGame();
    expect(
      screen.getByRole("button", { name: /Pass: take #2 for \$2,000/ }),
    ).toBeTruthy();
  });

  it("lets you pick one of your properties to sell", () => {
    current = base({
      phase: "SELLING",
      onOffer: undefined,
      cheques: [0, 8, 15],
      chosen: ["Bot #1"],
      activePlayer: "Bot #2",
      players: [
        {
          email: "a@example.com",
          lastActionAt: 0,
          money: 10,
          bid: 0,
          isBot: false,
          properties: [7, 22],
        },
        {
          email: "Bot #1",
          lastActionAt: 0,
          money: 16,
          bid: 0,
          isBot: true,
          properties: [3],
        },
        {
          email: "Bot #2",
          lastActionAt: 0,
          money: 18,
          bid: 0,
          isBot: true,
          properties: [1],
        },
      ],
    });
    renderGame();
    expect(
      screen.getByRole("button", { name: "Pick a card below" }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Property 22" }));
    fireEvent.click(screen.getByRole("button", { name: "Sell #22" }));
    expect(sellForSale).toHaveBeenCalledWith({ lobbyUID: "123", property: 22 });
  });

  it("shows only your own cash", () => {
    current = base({});
    renderGame();
    expect(screen.getByLabelText("$18,000 in cash")).toBeTruthy();
    expect(screen.queryByLabelText("$16,000 in cash")).toBeNull();
  });
});
