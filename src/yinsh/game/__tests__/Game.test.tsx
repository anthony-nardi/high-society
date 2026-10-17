import { MantineProvider } from "@mantine/core";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { YinshGameState } from "../types";

const moveYinshRing = vi.fn();
const placeYinshRing = vi.fn();
let current: YinshGameState;

vi.mock("../../client/moveYinshRing", () => ({
  default: (r: unknown) => moveYinshRing(r),
}));
vi.mock("../../client/placeYinshRing", () => ({
  default: (r: unknown) => placeYinshRing(r),
}));
vi.mock("../../client/removeYinshRow", () => ({ default: vi.fn() }));
vi.mock("../../client/removeYinshRing", () => ({ default: vi.fn() }));
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

const base = (over: Partial<YinshGameState>): YinshGameState => ({
  id: "l",
  game: "yinsh",
  players: [
    {
      email: "a@example.com",
      lastActionAt: 0,
      side: "WHITE",
      scored: 0,
      isBot: false,
    },
    { email: "Bot #1", lastActionAt: 0, side: "BLACK", scored: 0, isBot: true },
  ],
  activePlayer: "a@example.com",
  startAt: "0",
  status: "IN_PROGRESS",
  pool: 50,
  phase: "MOVE_RING",
  turn: 11,
  rings: { "5,5": "WHITE", "2,2": "BLACK" },
  markers: { "5,4": "BLACK" },
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

describe("YINSH table interaction", () => {
  it("previews a move at once, flipping what it jumps, until the server answers", async () => {
    let settle: (ok: boolean) => void = () => undefined;
    moveYinshRing.mockReturnValue(new Promise<boolean>((r) => (settle = r)));
    current = base({});
    renderGame();

    fireEvent.click(screen.getByLabelText("5,5 white ring (selected)"));
    fireEvent.click(screen.getByLabelText("5,3 empty (target)"));
    expect(moveYinshRing).toHaveBeenCalledWith({
      lobbyUID: "123",
      from: "5,5",
      to: "5,3",
    });

    // The ring has moved, the marker it left is there, the jumped marker flipped.
    expect(screen.getByLabelText("5,3 white ring (last)")).toBeTruthy();
    expect(screen.getByLabelText("5,5 white marker (last)")).toBeTruthy();
    expect(screen.getByLabelText("5,4 white marker")).toBeTruthy();
    expect(screen.getByText(/Sending your move/)).toBeTruthy();

    await act(async () => {
      settle(true);
    });
    // Accepted: the preview stays until the server state replaces it.
    expect(screen.getByLabelText("5,3 white ring (last)")).toBeTruthy();
  });

  it("puts the pieces back when the server rejects the move", async () => {
    moveYinshRing.mockResolvedValue(false);
    current = base({});
    renderGame();

    fireEvent.click(screen.getByLabelText("5,5 white ring (selected)"));
    await act(async () => {
      fireEvent.click(screen.getByLabelText("5,3 empty (target)"));
    });
    expect(screen.getByLabelText("5,5 white ring (selected)")).toBeTruthy();
    expect(screen.getByLabelText("5,4 black marker")).toBeTruthy();
  });

  it("clears a selected ring when tapping elsewhere", () => {
    current = base({});
    renderGame();
    fireEvent.click(screen.getByLabelText("5,5 white ring (selected)"));
    expect(screen.getByLabelText("5,3 empty (target)")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("0,6 empty"));
    expect(screen.queryByLabelText("5,3 empty (target)")).toBeNull();
    expect(moveYinshRing).not.toHaveBeenCalled();
  });

  it("shows everyone the row being taken", () => {
    current = base({
      phase: "REMOVE_ROW",
      activePlayer: "Bot #1",
      removing: "Bot #1",
      markers: Object.fromEntries(
        ["1,5", "2,5", "3,5", "4,5", "5,5"].map((c) => [c, "BLACK"]),
      ),
      rings: { "7,7": "WHITE", "0,6": "BLACK" },
    });
    const { container } = renderGame();
    expect(container.querySelectorAll(".row-glow")).toHaveLength(5);
    expect(screen.getByTestId("action-panel").textContent).toContain(
      "Waiting for Bot 1",
    );
  });
});
