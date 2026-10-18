import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FujiFlushGameState } from "../types";

const playFujiCard = vi.fn().mockResolvedValue(true);
let current: FujiFlushGameState;

vi.mock("../../client/playFujiCard", () => ({
  default: (r: unknown) => playFujiCard(r),
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
vi.mock("../../../shared/sound", () => ({ playSound: () => undefined }));

import Game from "..";
import { preview } from "../board";

const base = (over: Partial<FujiFlushGameState>): FujiFlushGameState => ({
  id: "l",
  game: "fuji-flush",
  players: [
    {
      email: "a@example.com",
      lastActionAt: 0,
      isBot: false,
      hand: [3, 7, 7],
      pushed: 1,
      flushed: 0,
    },
    {
      email: "Bot #1",
      lastActionAt: 0,
      isBot: true,
      hand: [2, 2, 9],
      played: 7,
      playedOn: 0,
      pushed: 0,
      flushed: 1,
    },
    {
      email: "Bot #2",
      lastActionAt: 0,
      isBot: true,
      hand: [4, 4],
      played: 8,
      playedOn: 1,
      pushed: 0,
      flushed: 0,
    },
  ],
  activePlayer: "a@example.com",
  startAt: "0",
  status: "IN_PROGRESS",
  turn: 2,
  deckCount: 70,
  discardCount: 2,
  lastPlay: { email: "Bot #2", card: 8, value: 8, turn: 1 },
  lastPush: {
    email: "a@example.com",
    card: 5,
    members: ["a@example.com"],
    turn: 2,
  },
  ...over,
});

afterEach(() => {
  cleanup();
  playFujiCard.mockClear();
});

describe("Fuji Flush", () => {
  it("previews what a card does and plays it", () => {
    current = base({});
    render(
      <MantineProvider>
        <Game />
      </MantineProvider>,
    );
    expect(screen.getByText(/Your 5 went through/)).toBeTruthy();
    expect(screen.getByTestId("last-play").textContent).toContain(
      "Bot 2 played a 8",
    );
    expect(screen.getByText("Pick a card below")).toBeTruthy();

    fireEvent.click(screen.getAllByRole("button", { name: "Card 7" })[0]);
    expect(screen.getByTestId("preview").textContent).toBe(
      "Joins Bot 1: two 7s make 14. Flushes Bot 2's 8.",
    );
    fireEvent.click(screen.getByText("Play 7"));
    expect(playFujiCard).toHaveBeenCalledWith({ lobbyUID: "123", card: 7 });
  });

  it("describes the quieter plays too", () => {
    const state = base({});
    expect(preview(state, "a@example.com", 3)).toBe(
      "Stays under Bot 1's 7 and Bot 2's 8.",
    );
    expect(preview(state, "a@example.com", 8)).toBe(
      "Joins Bot 2: two 8s make 16. Flushes Bot 1's 7.",
    );
    const pair = base({
      players: state.players.map((p) =>
        p.email === "Bot #2" ? { ...p, played: 7 } : p,
      ),
    });
    expect(preview(pair, "a@example.com", 14)).toBe(
      "Level with Bot 1 and Bot 2: neither is flushed.",
    );
    expect(preview(pair, "a@example.com", 7)).toBe(
      "Joins Bot 1 and Bot 2: three 7s make 21.",
    );
  });

  it("waits with the hand showing when it is not your turn", () => {
    current = base({ activePlayer: "Bot #1" });
    render(
      <MantineProvider>
        <Game />
      </MantineProvider>,
    );
    expect(screen.getByText(/Waiting for Bot 1/)).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Card 7" })).toHaveLength(2);
  });
});
