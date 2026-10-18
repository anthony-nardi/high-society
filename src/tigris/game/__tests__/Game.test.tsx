import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TigrisGameState } from "../types";

const placeTigrisTile = vi.fn().mockResolvedValue(true);
const positionTigrisLeader = vi.fn().mockResolvedValue(true);
const endTigrisTurn = vi.fn().mockResolvedValue(true);
const commitTigrisTiles = vi.fn().mockResolvedValue(true);
let current: TigrisGameState;

vi.mock("../../client/placeTigrisTile", () => ({
  default: (r: unknown) => placeTigrisTile(r),
}));
vi.mock("../../client/positionTigrisLeader", () => ({
  default: (r: unknown) => positionTigrisLeader(r),
}));
vi.mock("../../client/endTigrisTurn", () => ({
  default: (r: unknown) => endTigrisTurn(r),
}));
vi.mock("../../client/commitTigrisTiles", () => ({
  default: (r: unknown) => commitTigrisTiles(r),
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
import { highlightsFor } from "../highlights";

const base = (over: Partial<TigrisGameState>): TigrisGameState => ({
  id: "l",
  game: "tigris",
  players: [
    {
      email: "a@example.com",
      lastActionAt: 0,
      isBot: false,
      dynasty: "ARCHER",
      hand: ["RED", "GREEN", "BLUE", "BLACK", "BLACK", "RED"],
      catastrophes: 2,
      points: { RED: 1, BLUE: 0, GREEN: 2, BLACK: 0 },
      treasures: 1,
    },
    {
      email: "Bot #1",
      lastActionAt: 0,
      isBot: true,
      dynasty: "BULL",
      hand: ["RED", "RED", "RED", "RED", "RED", "RED"],
      catastrophes: 2,
      points: { RED: 0, BLUE: 0, GREEN: 0, BLACK: 0 },
      treasures: 0,
    },
  ],
  activePlayer: "a@example.com",
  turnPlayer: "a@example.com",
  startAt: "0",
  status: "IN_PROGRESS",
  phase: "ACTION",
  actionsLeft: 2,
  turn: 3,
  tiles: { "1_1": { colour: "RED", treasure: true }, "9_5": { colour: "RED" } },
  leaders: { "1_2": { email: "a@example.com", colour: "BLACK" } },
  bagCount: 100,
  ...over,
});

afterEach(() => {
  cleanup();
  placeTigrisTile.mockClear();
  positionTigrisLeader.mockClear();
  endTigrisTurn.mockClear();
  commitTigrisTiles.mockClear();
});

describe("Tigris & Euphrates", () => {
  it("lights legal spaces for a tile and places it", () => {
    current = base({});
    render(
      <MantineProvider>
        <Game />
      </MantineProvider>,
    );
    expect(screen.getByText(/Your turn · 2 actions left/)).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: "market tile" })[0]);
    expect(screen.getByTestId("hint").textContent).toContain(
      "place the market",
    );
    const lit = highlightsFor(current, "a@example.com", {
      kind: "tile",
      colour: "GREEN",
      index: 1,
    });
    expect(lit["1_3"]).toBe("legal");
    expect(lit["3_1"]).toBeUndefined(); // river
    fireEvent.click(screen.getByTestId("cell-1_3"));
    expect(placeTigrisTile).toHaveBeenCalledWith({
      lobbyUID: "123",
      cell: "1_3",
      colour: "GREEN",
    });
  });

  it("lights spaces beside temples for a leader and ends the turn", () => {
    current = base({});
    const lit = highlightsFor(current, "a@example.com", {
      kind: "leader",
      colour: "RED",
    });
    expect(lit["0_1"]).toBe("legal");
    expect(lit["1_2"]).toBeUndefined(); // the king stands there
    expect(lit["5_5"]).toBeUndefined(); // no temple
    render(
      <MantineProvider>
        <Game />
      </MantineProvider>,
    );
    fireEvent.click(screen.getByText("End turn"));
    expect(endTigrisTurn).toHaveBeenCalledWith({ lobbyUID: "123" });
  });

  it("lets a defender commit temples in a revolt", () => {
    current = base({
      phase: "CONFLICT",
      turnPlayer: "Bot #1",
      conflict: {
        kind: "REVOLT",
        colour: "RED",
        attacker: "Bot #1",
        defender: "a@example.com",
        attackerCell: "2_1",
        defenderCell: "0_1",
        attackerBase: 1,
        defenderBase: 1,
        attackerCommit: 1,
        stage: "DEFENDER",
      },
    });
    render(
      <MantineProvider>
        <Game />
      </MantineProvider>,
    );
    expect(screen.getByText("You defend")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Commit one more"));
    fireEvent.click(screen.getByText("Commit 1 temple"));
    expect(commitTigrisTiles).toHaveBeenCalledWith({
      lobbyUID: "123",
      count: 1,
    });
  });
});
