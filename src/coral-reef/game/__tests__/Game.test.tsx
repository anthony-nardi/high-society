import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CoralReefGameState } from "../types";
import { runningScore } from "../board";

const placeCoralReefCard = vi.fn().mockResolvedValue(true);
let current: CoralReefGameState;

vi.mock("../../client/placeCoralReefCard", () => ({
  default: (r: unknown) => placeCoralReefCard(r),
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

const base = (over: Partial<CoralReefGameState>): CoralReefGameState => ({
  id: "l",
  game: "coral-reef",
  players: [
    {
      email: "a@example.com",
      lastActionAt: 0,
      isBot: false,
      hand: ["GROUPER", "OCTOPUS", "CORAL"],
      grid: { "0_0": "KRILL", "0_1": "KRILL" },
    },
    {
      email: "Bot #1",
      lastActionAt: 0,
      isBot: true,
      hand: ["CORAL", "CORAL", "CORAL"],
      grid: { "0_0": "PLANKTON" },
    },
  ],
  activePlayer: "a@example.com",
  startAt: "0",
  status: "IN_PROGRESS",
  round: 1,
  pick: 7,
  turn: 15,
  ...over,
});

afterEach(() => {
  cleanup();
  placeCoralReefCard.mockClear();
});

describe("Coral Reef", () => {
  it("lifts a card, lights the open cells and places it", () => {
    current = base({});
    render(
      <MantineProvider>
        <Game />
      </MantineProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Grouper" }));
    expect(screen.getByTestId("hint").textContent).toContain("adjacent krill");
    fireEvent.click(screen.getByLabelText("open 1,0 (open)"));
    fireEvent.click(screen.getByText("Place Grouper"));
    expect(placeCoralReefCard).toHaveBeenCalledWith({
      lobbyUID: "123",
      card: 0,
      row: 1,
      col: 0,
    });
  });

  it("lets an octopus pick up a card and move it", () => {
    current = base({});
    render(
      <MantineProvider>
        <Game />
      </MantineProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Octopus" }));
    fireEvent.click(screen.getByLabelText("open 0,2 (open)"));
    // Pick up the first krill and move it under the octopus.
    fireEvent.click(screen.getByLabelText("KRILL 0,0"));
    expect(screen.getByTestId("hint").textContent).toContain("Now tap");
    fireEvent.click(screen.getByLabelText("open 1,2 (move)"));
    fireEvent.click(screen.getByText("Place Octopus and move"));
    expect(placeCoralReefCard).toHaveBeenCalledWith({
      lobbyUID: "123",
      card: 1,
      row: 0,
      col: 2,
      move: ["0_0", "1_2"],
    });
  });

  it("scores a reef on the table with the food web bonus", () => {
    const score = runningScore({
      "0_0": "CORAL",
      "0_1": "CLOWNFISH",
      "0_2": "PLANKTON",
      "1_0": "KRILL",
      "1_1": "EEL",
    });
    // Clownfish: coral left and plankton right = 4; eel: coral above? no, coral is diagonal... eel at (1,1) has coral? (0,1) is clownfish, (1,0) krill: no coral: 0.
    expect(score.byType.CLOWNFISH).toBe(4);
    expect(score.byType.EEL).toBeUndefined();
    expect(score.byType.KRILL).toBe(1);
    expect(score.byType.CORAL).toBeUndefined(); // row 0 is not the bottom row
    expect(score.prey).toBe(4);
    expect(score.foodWeb).toBe(0);
  });
});
