import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LyngkGameState } from "../types";

const moveLyngkStack = vi.fn();
const claimLyngkColour = vi.fn();
let current: LyngkGameState;

vi.mock("../../client/moveLyngkStack", () => ({
  default: (r: unknown) => moveLyngkStack(r),
}));
vi.mock("../../client/claimLyngkColour", () => ({
  default: (r: unknown) => claimLyngkColour(r),
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

const base = (over: Partial<LyngkGameState>): LyngkGameState => ({
  id: "l",
  game: "lyngk",
  players: [
    {
      email: "a@example.com",
      lastActionAt: 0,
      scored: 0,
      isBot: false,
      colours: ["RED"],
    },
    {
      email: "Bot #1",
      lastActionAt: 0,
      scored: 0,
      isBot: true,
      colours: ["BLUE"],
    },
  ],
  activePlayer: "a@example.com",
  startAt: "0",
  status: "IN_PROGRESS",
  turn: 3,
  stacks: { "0,4": ["RED"], "3,4": ["RED"], "5,4": ["GREEN"], "1,3": ["BLUE"] },
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

describe("LYNGK table interaction", () => {
  it("offers claims before the move and previews them", () => {
    claimLyngkColour.mockReturnValue(new Promise(() => undefined));
    current = base({});
    renderGame();
    expect(screen.getByRole("button", { name: /claim green/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /claim blue/i })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /claim green/i }));
    expect(claimLyngkColour).toHaveBeenCalledWith({
      lobbyUID: "123",
      colour: "GREEN",
    });
    expect(screen.getByText(/Sending your move/)).toBeTruthy();
  });

  it("links through its own colour and lands, previewing the stack", () => {
    moveLyngkStack.mockReturnValue(new Promise(() => undefined));
    current = base({});
    renderGame();
    // The blue single belongs to the bot and cannot be picked up.
    expect(
      screen.queryByLabelText("1,3 blue stack of 1 (selectable)"),
    ).toBeNull();
    fireEvent.click(screen.getByLabelText("0,4 red stack of 1 (selectable)"));
    expect(screen.getByLabelText("3,4 red stack of 1 (link)")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("3,4 red stack of 1 (link)"));
    expect(screen.getByLabelText("3,4 red stack of 1 (path)")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("5,4 green stack of 1 (target)"));
    expect(moveLyngkStack).toHaveBeenCalledWith({
      lobbyUID: "123",
      path: ["0,4", "3,4", "5,4"],
    });
    expect(screen.getByLabelText("5,4 red stack of 2 (last)")).toBeTruthy();
    expect(screen.getByLabelText("0,4 empty")).toBeTruthy();
  });

  it("clears the route when tapping elsewhere", () => {
    current = base({});
    renderGame();
    fireEvent.click(screen.getByLabelText("0,4 red stack of 1 (selectable)"));
    fireEvent.click(screen.getByLabelText("2,8 empty"));
    expect(
      screen.getByLabelText("0,4 red stack of 1 (selectable)"),
    ).toBeTruthy();
    expect(moveLyngkStack).not.toHaveBeenCalled();
  });
});
