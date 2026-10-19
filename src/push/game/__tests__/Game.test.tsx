import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PushGameState } from "../types";

const actions = {
  drawPushCard: vi.fn().mockResolvedValue(true),
  placePushCard: vi.fn().mockResolvedValue(true),
  takePushColumn: vi.fn().mockResolvedValue(true),
  bankPushColour: vi.fn().mockResolvedValue(true),
};
let current: PushGameState;

vi.mock("../../client/pushActions", () => ({
  drawPushCard: (r: unknown) => actions.drawPushCard(r),
  placePushCard: (r: unknown) => actions.placePushCard(r),
  takePushColumn: (r: unknown) => actions.takePushColumn(r),
  bankPushColour: (r: unknown) => actions.bankPushColour(r),
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

const base = (over: Partial<PushGameState>): PushGameState => ({
  id: "l",
  game: "push",
  players: [
    {
      email: "a@example.com",
      lastActionAt: 0,
      isBot: false,
      bench: ["RED_5", "RED_2", "BLUE_3"],
      bank: ["GREEN_6"],
    },
    { email: "Bot #1", lastActionAt: 0, isBot: true, bench: ["YELLOW_4"] },
    { email: "Bot #2", lastActionAt: 0, isBot: true },
  ],
  activePlayer: "a@example.com",
  turnPlayer: "a@example.com",
  startAt: "0",
  status: "IN_PROGRESS",
  phase: "PUSH",
  switches: 0,
  drawn: 0,
  deckCount: 80,
  discardCount: 4,
  turn: 2,
  ...over,
});

const mount = () =>
  render(
    <MantineProvider>
      <Game />
    </MantineProvider>,
  );

afterEach(() => {
  cleanup();
  for (const fn of Object.values(actions)) fn.mockClear();
});

describe("PUSH", () => {
  it("offers a draw or a protection before the first card", () => {
    current = base({});
    mount();
    expect(screen.getByText("Turn over a card")).toBeTruthy();
    expect(screen.getByText("Protect Red (7)")).toBeTruthy();
    fireEvent.click(screen.getByText("Protect Blue (3)"));
    expect(actions.bankPushColour).toHaveBeenCalledWith({
      lobbyUID: "123",
      colour: "BLUE",
    });
    cleanup();
    mount();
    fireEvent.click(screen.getByText("Turn over a card"));
    expect(actions.drawPushCard).toHaveBeenCalledWith({ lobbyUID: "123" });
  });

  it("lights the columns a pending card may join and places it there", () => {
    current = base({
      drawn: 3,
      columns: [["RED_2", "BLUE_5"], ["RED_6"]],
      pending: "GREEN_5",
    });
    mount();
    expect(screen.getByTestId("hint").textContent).toContain(
      "Tap a glowing column",
    );
    // Green 5 clashes with Blue 5 in column 1; column 2 and a new column are open.
    expect(screen.getByTestId("column-0").hasAttribute("disabled")).toBe(true);
    expect(screen.getByTestId("column-1").hasAttribute("disabled")).toBe(false);
    fireEvent.click(screen.getByLabelText("Place in start a new column"));
    expect(actions.placePushCard).toHaveBeenCalledWith({
      lobbyUID: "123",
      column: 2,
    });
  });

  it("stops by taking a column, and chooses one on another's turn", () => {
    current = base({ drawn: 2, columns: [["RED_2"], ["BLUE_5", "DICE"]] });
    mount();
    expect(screen.getByText("Push: turn over another")).toBeTruthy();
    fireEvent.click(screen.getByTestId("column-1"));
    expect(actions.takePushColumn).toHaveBeenCalledWith({
      lobbyUID: "123",
      column: 1,
    });
    cleanup();
    current = base({
      phase: "CHOOSE",
      turnPlayer: "Bot #2",
      activePlayer: "a@example.com",
      columns: [["PURPLE_1"]],
    });
    mount();
    expect(screen.getByText("Choose a column")).toBeTruthy();
    fireEvent.click(screen.getByTestId("column-0"));
    expect(actions.takePushColumn).toHaveBeenCalledWith({
      lobbyUID: "123",
      column: 0,
    });
  });

  it("shows the die when a roll is the latest thing to happen", () => {
    current = base({
      activePlayer: "Bot #1",
      turnPlayer: "Bot #1",
      phase: "CHOOSE",
      notification: {
        timestamp: 1,
        title:
          "a@example.com pushes too far: Green 2 fits nowhere. The die shows Red and takes Red 5, Red 2.",
      },
      lastRoll: {
        email: "a@example.com",
        face: "RED",
        reason: "BUST",
        card: "GREEN_2",
        lost: ["RED_5", "RED_2"],
        turn: 2,
      },
    });
    mount();
    expect(screen.getByTestId("roll-moment").textContent).toContain(
      "Red: you lose 7 points.",
    );
  });
});
