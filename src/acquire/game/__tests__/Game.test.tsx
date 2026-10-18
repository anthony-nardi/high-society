import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AcquireGameState, Chain } from "../types";
import { CHAINS } from "../board";

const placeAcquireTile = vi.fn().mockReturnValue(new Promise(() => undefined));
const foundAcquireChain = vi.fn().mockReturnValue(new Promise(() => undefined));
const chooseAcquireSurvivor = vi
  .fn()
  .mockReturnValue(new Promise(() => undefined));
const disposeAcquireStock = vi
  .fn()
  .mockReturnValue(new Promise(() => undefined));
const buyAcquireStock = vi.fn().mockReturnValue(new Promise(() => undefined));
const declareAcquireEnd = vi.fn().mockReturnValue(new Promise(() => undefined));
let current: AcquireGameState;

vi.mock("../../client/placeAcquireTile", () => ({
  default: (r: unknown) => placeAcquireTile(r),
}));
vi.mock("../../client/foundAcquireChain", () => ({
  default: (r: unknown) => foundAcquireChain(r),
}));
vi.mock("../../client/chooseAcquireSurvivor", () => ({
  default: (r: unknown) => chooseAcquireSurvivor(r),
}));
vi.mock("../../client/disposeAcquireStock", () => ({
  default: (r: unknown) => disposeAcquireStock(r),
}));
vi.mock("../../client/buyAcquireStock", () => ({
  default: (r: unknown) => buyAcquireStock(r),
}));
vi.mock("../../client/declareAcquireEnd", () => ({
  default: (r: unknown) => declareAcquireEnd(r),
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

const chains = (
  over: Partial<{ [c in Chain]: { size: number; stockLeft: number } }> = {},
) =>
  Object.fromEntries(
    CHAINS.map((c) => [c, over[c] ?? { size: 0, stockLeft: 25 }]),
  ) as AcquireGameState["chains"];

const base = (over: Partial<AcquireGameState>): AcquireGameState => ({
  id: "l",
  game: "acquire",
  players: [
    {
      email: "a@example.com",
      lastActionAt: 0,
      money: 6000,
      tiles: ["5E", "6E", "1A"],
      isBot: false,
      stocks: { TOWER: 2 },
    },
    {
      email: "Bot #1",
      lastActionAt: 0,
      money: 6000,
      tiles: ["9I", "2B", "3C"],
      isBot: true,
      stocks: { TOWER: 1 },
    },
  ],
  activePlayer: "a@example.com",
  turnPlayer: "a@example.com",
  startAt: "0",
  status: "IN_PROGRESS",
  phase: "PLACE",
  board: { "7E": "NONE", "1B": "TOWER", "1C": "TOWER" },
  chains: chains({ TOWER: { size: 2, stockLeft: 22 } }),
  bought: 0,
  mode: "TYCOON",
  bagCount: 90,
  turn: 4,
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

describe("Acquire table", () => {
  it("plays a tile from the hand and shows what it does", () => {
    current = base({});
    renderGame();
    expect(
      screen.getByLabelText("6E in your hand: founds a chain"),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Tile 5E" }));
    fireEvent.click(screen.getByRole("button", { name: "Play 5E" }));
    expect(placeAcquireTile).toHaveBeenCalledWith({
      lobbyUID: "123",
      tile: "5E",
    });
  });

  it("offers the free chains when founding", () => {
    current = base({ phase: "FOUND", merger: { tile: "6E", defunct: [] } });
    renderGame();
    expect(screen.queryByRole("button", { name: "Tower" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Imperial" }));
    expect(foundAcquireChain).toHaveBeenCalledWith({
      lobbyUID: "123",
      chain: "IMPERIAL",
    });
  });

  it("settles absorbed shares and buys up to three", () => {
    current = base({
      phase: "DISPOSE",
      activePlayer: "a@example.com",
      merger: {
        tile: "4E",
        survivor: "LUXOR",
        defunct: [],
        current: "TOWER",
        price: 200,
        queue: ["a@example.com"],
      },
      chains: chains({
        TOWER: { size: 2, stockLeft: 22 },
        LUXOR: { size: 5, stockLeft: 20 },
      }),
    });
    renderGame();
    expect(screen.getByText(/Tower is absorbed by Luxor/)).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Trade · two for one Luxor: more" }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Settle/ }));
    expect(disposeAcquireStock).toHaveBeenCalledWith({
      lobbyUID: "123",
      sell: 0,
      trade: 2,
    });
    cleanup();

    current = base({ phase: "BUY" });
    renderGame();
    fireEvent.click(screen.getByRole("button", { name: "One more Tower" }));
    fireEvent.click(screen.getByRole("button", { name: "One more Tower" }));
    fireEvent.click(
      screen.getByRole("button", { name: /Buy 2 for \$400 and end turn/ }),
    );
    expect(buyAcquireStock).toHaveBeenCalledWith({
      lobbyUID: "123",
      purchases: { TOWER: 2 },
    });
  });

  it("hides other players' cash and offers the end call only when allowed", () => {
    current = base({ phase: "BUY" });
    renderGame();
    expect(screen.getByLabelText("$6,000 in cash")).toBeTruthy();
    expect(screen.getAllByLabelText(/in cash/)).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /Call the end/ })).toBeNull();
    cleanup();
    current = base({
      phase: "BUY",
      chains: chains({ TOWER: { size: 12, stockLeft: 22 } }),
    });
    renderGame();
    fireEvent.click(screen.getByRole("button", { name: /Call the end/ }));
    expect(declareAcquireEnd).toHaveBeenCalledWith({ lobbyUID: "123" });
  });
});
