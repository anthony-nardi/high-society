import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GipfGameState } from "../types";

const pushGipfPiece = vi.fn();
const removeGipfRow = vi.fn();
let current: GipfGameState;

vi.mock("../../client/pushGipfPiece", () => ({
  default: (r: unknown) => pushGipfPiece(r),
}));
vi.mock("../../client/removeGipfRow", () => ({
  default: (r: unknown) => removeGipfRow(r),
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

const base = (over: Partial<GipfGameState>): GipfGameState => ({
  id: "l",
  game: "gipf",
  players: [
    {
      email: "a@example.com",
      lastActionAt: 0,
      side: "WHITE",
      reserve: 12,
      captured: 0,
      isBot: false,
    },
    {
      email: "Bot #1",
      lastActionAt: 0,
      side: "BLACK",
      reserve: 12,
      captured: 0,
      isBot: true,
    },
  ],
  activePlayer: "a@example.com",
  startAt: "0",
  status: "IN_PROGRESS",
  phase: "MOVE",
  turn: 1,
  pieces: { "1,4": "BLACK", "2,4": "WHITE" },
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

describe("GIPF table interaction", () => {
  it("picks a dot, then pushes in and previews the shove", () => {
    pushGipfPiece.mockReturnValue(new Promise(() => undefined));
    current = base({});
    renderGame();
    fireEvent.click(screen.getByLabelText("0,4 dot (dot)"));
    expect(screen.getByLabelText("0,4 dot (selectedDot)")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("1,4 black piece (target)"));
    expect(pushGipfPiece).toHaveBeenCalledWith({
      lobbyUID: "123",
      from: "0,4",
      to: "1,4",
    });
    // Preview: white lands on 1,4, black slid to 2,4, white to 3,4.
    expect(screen.getByLabelText("1,4 white piece (last)")).toBeTruthy();
    expect(screen.getByLabelText("2,4 black piece")).toBeTruthy();
    expect(screen.getByLabelText("3,4 white piece")).toBeTruthy();
    expect(screen.getByText(/Sending your move/)).toBeTruthy();
  });

  it("clears the dot when tapping elsewhere and ignores a full line", () => {
    current = base({
      pieces: Object.fromEntries(
        ["1,4", "2,4", "3,4", "4,4", "5,4", "6,4", "7,4"].map((c) => [
          c,
          "BLACK",
        ]),
      ),
    });
    renderGame();
    expect(screen.queryByLabelText("0,4 dot (dot)")).toBeNull();
    fireEvent.click(screen.getByLabelText("1,3 dot (dot)"));
    fireEvent.click(screen.getByLabelText("4,4 black piece"));
    expect(screen.queryByLabelText("1,3 dot (selectedDot)")).toBeNull();
    expect(pushGipfPiece).not.toHaveBeenCalled();
  });

  it("lets the player choose between crossing rows by a piece unique to one", () => {
    removeGipfRow.mockResolvedValue(true);
    current = base({
      phase: "REMOVE_ROW",
      removing: "a@example.com",
      pieces: {
        "2,4": "WHITE",
        "3,4": "WHITE",
        "4,4": "WHITE",
        "5,4": "WHITE",
        "4,2": "WHITE",
        "4,3": "WHITE",
        "4,5": "WHITE",
      },
    });
    const { container } = renderGame();
    expect(container.querySelectorAll(".row-glow")).toHaveLength(7);
    fireEvent.click(screen.getByLabelText("4,4 white piece (row)"));
    expect(removeGipfRow).not.toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText("2,4 white piece (row)"));
    expect(removeGipfRow).toHaveBeenCalledWith({
      lobbyUID: "123",
      coord: "2,4",
    });
    expect(screen.getByLabelText("4,2 white piece")).toBeTruthy();
  });
});
