import { MantineProvider } from "@mantine/core";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DvonnGameState } from "../types";

const moveDvonnStack = vi.fn();
const placeDvonnPiece = vi.fn();
let current: DvonnGameState;

vi.mock("../../client/moveDvonnStack", () => ({
  default: (r: unknown) => moveDvonnStack(r),
}));
vi.mock("../../client/placeDvonnPiece", () => ({
  default: (r: unknown) => placeDvonnPiece(r),
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

const base = (over: Partial<DvonnGameState>): DvonnGameState => ({
  id: "l",
  game: "dvonn",
  players: [
    {
      email: "a@example.com",
      lastActionAt: 0,
      side: "WHITE",
      pieces: 0,
      dvonn: 0,
      isBot: false,
    },
    {
      email: "Bot #1",
      lastActionAt: 0,
      side: "BLACK",
      pieces: 0,
      dvonn: 0,
      isBot: true,
    },
  ],
  activePlayer: "a@example.com",
  startAt: "0",
  status: "IN_PROGRESS",
  phase: "MOVE",
  turn: 50,
  stacks: {
    "2,2": ["DVONN"],
    "3,2": ["WHITE"],
    "4,2": ["BLACK"],
    "5,2": ["BLACK"],
  },
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

describe("DVONN table interaction", () => {
  it("places a DVONN piece first, then own pieces", () => {
    placeDvonnPiece.mockResolvedValue(true);
    current = base({
      phase: "PLACE",
      stacks: {},
      players: [
        {
          email: "a@example.com",
          lastActionAt: 0,
          side: "WHITE",
          pieces: 23,
          dvonn: 2,
          isBot: false,
        },
        {
          email: "Bot #1",
          lastActionAt: 0,
          side: "BLACK",
          pieces: 23,
          dvonn: 1,
          isBot: true,
        },
      ],
    });
    renderGame();
    expect(screen.getByText(/Place a red DVONN piece/)).toBeTruthy();
    fireEvent.click(screen.getByLabelText("5,2 empty"));
    expect(placeDvonnPiece).toHaveBeenCalledWith({
      lobbyUID: "123",
      coord: "5,2",
    });
    // The preview shows the red piece straight away.
    expect(screen.getByLabelText("5,2 DVONN stack of 1 (last)")).toBeTruthy();
  });

  it("selects a stack, previews the jump and the pieces it cuts off", () => {
    moveDvonnStack.mockReturnValue(new Promise(() => undefined));
    current = base({});
    renderGame();
    fireEvent.click(screen.getByLabelText("3,2 white stack of 1 (selectable)"));
    expect(screen.getByLabelText("2,2 DVONN stack of 1 (target)")).toBeTruthy();
    expect(screen.getByLabelText("4,2 black stack of 1 (target)")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("2,2 DVONN stack of 1 (target)"));
    expect(moveDvonnStack).toHaveBeenCalledWith({
      lobbyUID: "123",
      from: "3,2",
      to: "2,2",
    });
    expect(screen.getByLabelText("2,2 white stack of 2 (last)")).toBeTruthy();
    // 4,2 and 5,2 lost contact with the DVONN piece.
    expect(screen.getByLabelText("4,2 empty")).toBeTruthy();
    expect(screen.getByLabelText("5,2 empty")).toBeTruthy();
    expect(screen.getByText(/Sending your move/)).toBeTruthy();
  });

  it("puts a selection back when tapping elsewhere and rolls back a rejected move", async () => {
    moveDvonnStack.mockResolvedValue(false);
    current = base({});
    renderGame();
    fireEvent.click(screen.getByLabelText("3,2 white stack of 1 (selectable)"));
    fireEvent.click(screen.getByLabelText("8,4 empty"));
    expect(screen.queryByLabelText("2,2 DVONN stack of 1 (target)")).toBeNull();

    fireEvent.click(screen.getByLabelText("3,2 white stack of 1 (selectable)"));
    await act(async () => {
      fireEvent.click(screen.getByLabelText("4,2 black stack of 1 (target)"));
    });
    // The pieces are back, and the stack stays selected for another try.
    expect(
      screen.getByLabelText("3,2 white stack of 1 (selected)"),
    ).toBeTruthy();
    expect(screen.getByLabelText("4,2 black stack of 1 (target)")).toBeTruthy();
    expect(screen.getByLabelText("5,2 black stack of 1")).toBeTruthy();
  });
});
