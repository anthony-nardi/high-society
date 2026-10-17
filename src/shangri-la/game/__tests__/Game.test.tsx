import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Master, ShangriLaGameState } from "../types";
import { ALL_BRIDGES, MASTERS } from "../board";

const placeShangriLaMaster = vi
  .fn()
  .mockReturnValue(new Promise(() => undefined));
const recruitShangriLaStudents = vi
  .fn()
  .mockReturnValue(new Promise(() => undefined));
const journeyShangriLa = vi.fn().mockReturnValue(new Promise(() => undefined));
let current: ShangriLaGameState;

vi.mock("../../client/placeShangriLaMaster", () => ({
  default: (r: unknown) => placeShangriLaMaster(r),
}));
vi.mock("../../client/recruitShangriLaStudents", () => ({
  default: (r: unknown) => recruitShangriLaStudents(r),
}));
vi.mock("../../client/journeyShangriLa", () => ({
  default: (r: unknown) => journeyShangriLa(r),
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

const supply = () =>
  Object.fromEntries(MASTERS.map((m) => [m, 5])) as { [m in Master]: number };

const base = (over: Partial<ShangriLaGameState>): ShangriLaGameState => ({
  id: "l",
  game: "shangri-la",
  players: [
    {
      email: "a@example.com",
      lastActionAt: 0,
      colour: "RED",
      supply: supply(),
      placed: [...MASTERS],
      isBot: false,
    },
    {
      email: "Bot #1",
      lastActionAt: 0,
      colour: "BLUE",
      supply: supply(),
      placed: [...MASTERS],
      isBot: true,
    },
    {
      email: "Bot #2",
      lastActionAt: 0,
      colour: "YELLOW",
      supply: supply(),
      placed: [...MASTERS],
      isBot: true,
    },
  ],
  activePlayer: "a@example.com",
  startAt: "0",
  status: "IN_PROGRESS",
  phase: "PLAY",
  villages: Array.from({ length: 13 }, (_, id) => ({ id })),
  bridges: ALL_BRIDGES.filter(([a, b]) => a !== 6 && b !== 6),
  turn: 5,
  passes: 0,
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

describe("Shangri-La table", () => {
  it("places a setup master by village then discipline", () => {
    current = base({
      phase: "SETUP",
      players: [
        {
          email: "a@example.com",
          lastActionAt: 0,
          colour: "RED",
          supply: supply(),
          placed: ["HEALER"],
          isBot: false,
        },
        {
          email: "Bot #1",
          lastActionAt: 0,
          colour: "BLUE",
          supply: supply(),
          isBot: true,
        },
        {
          email: "Bot #2",
          lastActionAt: 0,
          colour: "YELLOW",
          supply: supply(),
          isBot: true,
        },
      ],
    });
    renderGame();
    fireEvent.click(screen.getByLabelText("Tashi, strength 0 (selectable)"));
    expect(screen.queryByRole("button", { name: "Healer" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Priest" }));
    expect(placeShangriLaMaster).toHaveBeenCalledWith({
      lobbyUID: "123",
      village: 0,
      type: "PRIEST",
    });
  });

  it("recruits up to two students and sends a journey to a neighbour", () => {
    const villages = Array.from(
      { length: 13 },
      (_, id) => ({ id }) as ShangriLaGameState["villages"][number],
    );
    villages[0] = {
      id: 0,
      spaces: {
        HEALER: { owner: "a@example.com", student: true },
        PRIEST: { owner: "a@example.com" },
      },
    };
    villages[1] = { id: 1, spaces: { RAINMAKER: { owner: "Bot #1" } } };
    current = base({ villages });
    renderGame();

    fireEvent.click(screen.getByRole("radio", { name: "Recruit" }));
    fireEvent.click(screen.getByLabelText("Tashi, strength 3 (selectable)"));
    fireEvent.click(screen.getByRole("button", { name: "Priest" }));
    fireEvent.click(screen.getByRole("button", { name: "Recruit 1" }));
    expect(recruitShangriLaStudents).toHaveBeenCalledWith({
      lobbyUID: "123",
      picks: [[0, "PRIEST"]],
    });
    cleanup();

    renderGame();
    fireEvent.click(screen.getByRole("radio", { name: "Journey" }));
    fireEvent.click(screen.getByLabelText("Tashi, strength 3 (selectable)"));
    fireEvent.click(screen.getByLabelText("Nyima, strength 1 (target)"));
    expect(
      screen.getByText(/Tashi \(3\) against Nyima \(1\): stronger/),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Send to Nyima" }));
    expect(journeyShangriLa).toHaveBeenCalledWith({
      lobbyUID: "123",
      from: 0,
      to: 1,
    });
  });
});
