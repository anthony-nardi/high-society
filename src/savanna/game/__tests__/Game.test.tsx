import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SavannaGameState } from "../types";
import { runningScore } from "../board";

const placeSavannaCard = vi.fn().mockResolvedValue(true);
const flipSavannaPrey = vi.fn().mockResolvedValue(true);
let current: SavannaGameState;

vi.mock("../../client/placeSavannaCard", () => ({
  default: (r: unknown) => placeSavannaCard(r),
}));
vi.mock("../../client/flipSavannaPrey", () => ({
  default: (r: unknown) => flipSavannaPrey(r),
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

const base = (over: Partial<SavannaGameState>): SavannaGameState => ({
  id: "l",
  game: "savanna",
  players: [
    {
      email: "a@example.com",
      lastActionAt: 0,
      isBot: false,
      hand: ["GIRAFFE", "LION", "GRASSLAND"],
      grid: { "0_0": "TREE", "0_1": "GAZELLE" },
    },
    {
      email: "Bot #1",
      lastActionAt: 0,
      isBot: true,
      hand: ["TREE", "TREE", "TREE"],
      grid: { "0_0": "GRASSLAND" },
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
  placeSavannaCard.mockClear();
  flipSavannaPrey.mockClear();
});

describe("Savanna", () => {
  it("lifts a card, lights the open cells and places it", () => {
    current = base({});
    render(
      <MantineProvider>
        <Game />
      </MantineProvider>,
    );
    expect(screen.getAllByText(/pick 8 of 10/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Giraffe" }));
    expect(screen.getByTestId("hint").textContent).toContain(
      "adjacent to a tree",
    );
    fireEvent.click(screen.getByLabelText("open 1,0 (open)"));
    fireEvent.click(screen.getByText("Place Giraffe"));
    expect(placeSavannaCard).toHaveBeenCalledWith({
      lobbyUID: "123",
      card: 0,
      row: 1,
      col: 0,
    });
  });

  it("shows the hunters' flips as backs in the running score", () => {
    const score = runningScore({
      "0_0": "CHEETAH",
      "0_1": "LION",
      "0_2": "GRASSLAND",
      "1_1": "GAZELLE",
      "2_0": "ZEBRA",
      "2_2": "HYENA",
    });
    expect(score.byType.CHEETAH).toBe(3);
    expect(score.byType.LION).toBe(4);
    expect(score.flipped).toEqual(["1_1", "2_0"]);
    expect(score.byType.HYENA).toBe(6);
    current = base({
      players: [
        {
          ...base({}).players[0],
          grid: { "0_0": "CHEETAH", "1_1": "GAZELLE" },
          hand: ["TREE"],
        },
        base({}).players[1],
      ],
    });
    render(
      <MantineProvider>
        <Game />
      </MantineProvider>,
    );
    expect(screen.getByLabelText("Gazelle (facedown)")).toBeTruthy();
  });

  it("lets you choose which prey the lions flip when the savanna is complete", () => {
    current = base({
      phase: "FLIP",
      flipping: ["a@example.com"],
      players: [
        {
          ...base({}).players[0],
          hand: undefined,
          grid: {
            "0_0": "LION",
            "0_1": "GRASSLAND",
            "1_0": "GAZELLE",
            "1_1": "ZEBRA",
            "1_2": "HYENA",
          },
        },
        { ...base({}).players[1], hand: undefined },
      ],
    });
    render(
      <MantineProvider>
        <Game />
      </MantineProvider>,
    );
    expect(screen.getByText("The lions hunt: 0 of 1 chosen")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("ZEBRA 1,1 (prey)"));
    expect(screen.getByText("The lions hunt: 1 of 1 chosen")).toBeTruthy();
    expect(screen.getByLabelText("Zebra (facedown)")).toBeTruthy();
    fireEvent.click(screen.getByText("Flip it"));
    expect(flipSavannaPrey).toHaveBeenCalledWith({
      lobbyUID: "123",
      cells: ["1_1"],
    });
  });
});
