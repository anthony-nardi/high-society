import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ZertzGameState } from "../types";
import { ALL_RINGS } from "../board";

const captureMarble = vi.fn().mockResolvedValue(undefined);
const placeMarble = vi.fn().mockResolvedValue(undefined);
const removeRing = vi.fn().mockResolvedValue(undefined);
let current: ZertzGameState;

vi.mock("../../client/captureMarble", () => ({
  default: (r: unknown) => captureMarble(r),
}));
vi.mock("../../client/placeMarble", () => ({
  default: (r: unknown) => placeMarble(r),
}));
vi.mock("../../client/removeRing", () => ({
  default: (r: unknown) => removeRing(r),
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

const base = (over: Partial<ZertzGameState>): ZertzGameState => ({
  id: "l",
  game: "zertz",
  players: [
    { email: "a@example.com", lastActionAt: 0, isBot: false },
    { email: "Bot #1", lastActionAt: 0, isBot: true },
  ],
  activePlayer: "a@example.com",
  startAt: "0",
  status: "IN_PROGRESS",
  rings: [...ALL_RINGS],
  pool: { WHITE: 6, GRAY: 8, BLACK: 10 },
  phase: "MOVE",
  turn: 1,
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

describe("ZÈRTZ table interaction", () => {
  it("continues a capture chain with the same marble", () => {
    current = base({
      phase: "CONTINUE_CAPTURE",
      capturingAt: "3,3",
      marbles: { "3,3": "BLACK", "4,3": "WHITE" },
      lastMove: { type: "capture", from: "1,3", to: "3,3", colour: "WHITE" },
    });
    renderGame();
    expect(screen.getByText(/can jump again/)).toBeTruthy();
    fireEvent.click(screen.getByLabelText("5,3 empty ring (target)"));
    expect(captureMarble).toHaveBeenCalledWith({
      lobbyUID: "123",
      from: "3,3",
      to: "5,3",
    });
  });

  it("selects a capturing marble, then jumps", () => {
    current = base({ marbles: { "3,3": "WHITE", "4,3": "GRAY" } });
    renderGame();
    fireEvent.click(screen.getByLabelText("3,3 white marble (capturer)"));
    fireEvent.click(screen.getByLabelText("5,3 empty ring (target)"));
    expect(captureMarble).toHaveBeenCalledWith({
      lobbyUID: "123",
      from: "3,3",
      to: "5,3",
    });
  });

  it("places the chosen colour and then removes a ring", () => {
    current = base({});
    renderGame();
    fireEvent.click(screen.getByRole("button", { name: /gray/i }));
    fireEvent.click(screen.getByLabelText("4,3 empty ring"));
    expect(placeMarble).toHaveBeenCalledWith({
      lobbyUID: "123",
      colour: "GRAY",
      to: "4,3",
    });

    cleanup();
    current = base({ phase: "REMOVE_RING", marbles: { "4,3": "GRAY" } });
    renderGame();
    fireEvent.click(screen.getByLabelText("4,0 empty ring (removable)"));
    expect(removeRing).toHaveBeenCalledWith({ lobbyUID: "123", coord: "4,0" });
  });
  it("previews a capture at once and puts a selection back when tapping elsewhere", () => {
    captureMarble.mockReturnValue(new Promise(() => undefined));
    current = base({ marbles: { "3,3": "WHITE", "4,3": "GRAY" } });
    renderGame();
    fireEvent.click(screen.getByLabelText("3,3 white marble (capturer)"));
    expect(screen.getByLabelText("5,3 empty ring (target)")).toBeTruthy();
    // Anywhere else clears the selection.
    fireEvent.click(screen.getByLabelText("4,0 empty ring"));
    expect(screen.queryByLabelText("5,3 empty ring (target)")).toBeNull();

    fireEvent.click(screen.getByLabelText("3,3 white marble (capturer)"));
    fireEvent.click(screen.getByLabelText("5,3 empty ring (target)"));
    // The jump shows before the server answers; the taken marble is gone.
    expect(screen.getByLabelText("5,3 white marble (last)")).toBeTruthy();
    expect(screen.getByLabelText("4,3 empty ring")).toBeTruthy();
    expect(screen.getByText(/Sending your move/)).toBeTruthy();
  });
});
