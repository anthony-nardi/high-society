import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CondottiereGameState } from "../types";

const chooseCondottiereBattlefield = vi
  .fn()
  .mockReturnValue(new Promise(() => undefined));
const playCondottiereCard = vi
  .fn()
  .mockReturnValue(new Promise(() => undefined));
const passCondottiere = vi.fn().mockReturnValue(new Promise(() => undefined));
let current: CondottiereGameState;

vi.mock("../../client/chooseCondottiereBattlefield", () => ({
  default: (r: unknown) => chooseCondottiereBattlefield(r),
}));
vi.mock("../../client/playCondottiereCard", () => ({
  default: (r: unknown) => playCondottiereCard(r),
}));
vi.mock("../../client/passCondottiere", () => ({
  default: (r: unknown) => passCondottiere(r),
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

const base = (over: Partial<CondottiereGameState>): CondottiereGameState => ({
  id: "l",
  game: "condottiere",
  players: [
    {
      email: "a@example.com",
      lastActionAt: 0,
      hand: ["M3", "SCARECROW", "BISHOP", "M10"],
      line: ["M6"],
      isBot: false,
      regions: [0],
    },
    {
      email: "Bot #1",
      lastActionAt: 0,
      hand: ["M1", "M2"],
      line: ["M4", "COURTESAN"],
      isBot: true,
    },
    {
      email: "Bot #2",
      lastActionAt: 0,
      hand: [],
      passed: true,
      isBot: true,
      regions: [15],
    },
  ],
  activePlayer: "a@example.com",
  startAt: "0",
  status: "IN_PROGRESS",
  phase: "BATTLE",
  condottiere: "a@example.com",
  battlefield: 7,
  deckCount: 60,
  winTotal: 6,
  winAdjacent: 4,
  turn: 3,
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

describe("Condottiere table", () => {
  it("shows the lines with their strength and plays a mercenary from the hand", () => {
    current = base({});
    renderGame();
    expect(screen.getByLabelText("a strength 6")).toBeTruthy();
    expect(screen.getByLabelText("Bot 1 strength 5")).toBeTruthy();
    const hand = screen.getByLabelText("Your hand");
    fireEvent.click(
      hand.querySelector('[aria-label="Mercenary 3"]') as Element,
    );
    // Lifting a card stages it; the button plays it.
    fireEvent.click(screen.getByRole("button", { name: "Play Mercenary 3" }));
    expect(playCondottiereCard).toHaveBeenCalledWith({
      lobbyUID: "123",
      index: 0,
    });
  });

  it("asks which mercenary a scarecrow takes back, and where a bishop sends the pope", () => {
    current = base({});
    renderGame();
    const hand = screen.getByLabelText("Your hand");
    fireEvent.click(hand.querySelector('[aria-label="Scarecrow"]') as Element);
    fireEvent.click(screen.getByRole("button", { name: "Play Scarecrow" }));
    expect(screen.getByText(/Choose which of your mercenaries/)).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Take back Mercenary 6" }),
    ).toBeTruthy();
    const line = screen.getByLabelText("a's line");
    fireEvent.click(
      line.querySelector('[aria-label="Mercenary 6 (selected)"]') as Element,
    );
    expect(playCondottiereCard).toHaveBeenCalledWith({
      lobbyUID: "123",
      index: 1,
      target: 0,
    });
    cleanup();

    current = base({});
    renderGame();
    fireEvent.click(
      screen
        .getByLabelText("Your hand")
        .querySelector('[aria-label="Bishop"]') as Element,
    );
    fireEvent.click(screen.getByRole("button", { name: "Play Bishop" }));
    fireEvent.click(screen.getByLabelText("Venezia (selectable)"));
    expect(playCondottiereCard).toHaveBeenCalledWith({
      lobbyUID: "123",
      index: 2,
      target: 2,
    });
  });

  it("passes, and chooses a battlefield when holding the Condottiere", () => {
    current = base({});
    renderGame();
    fireEvent.click(screen.getByRole("button", { name: "Pass" }));
    expect(passCondottiere).toHaveBeenCalledWith({ lobbyUID: "123" });
    cleanup();

    current = base({ phase: "CHOOSE", battlefield: undefined, pope: 2 });
    renderGame();
    expect(screen.queryByLabelText(/Venezia.*\(selectable\)/)).toBeNull(); // the Pope's region
    expect(screen.queryByLabelText(/Torino.*\(selectable\)/)).toBeNull(); // held by a
    fireEvent.click(screen.getByLabelText("Siena (selectable)"));
    expect(chooseCondottiereBattlefield).toHaveBeenCalledWith({
      lobbyUID: "123",
      region: 12,
    });
  });
});
