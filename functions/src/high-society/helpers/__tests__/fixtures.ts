import { HighSocietyGameState, HighSocietyPlayerState } from "../../types";

export const STARTING_MONEY = [
  "1",
  "2",
  "3",
  "4",
  "6",
  "8",
  "10",
  "12",
  "15",
  "20",
  "25",
];

export function player(
  email: string,
  overrides: Partial<HighSocietyPlayerState> = {},
): HighSocietyPlayerState {
  return {
    email,
    lastActionAt: 0,
    moneyCards: [...STARTING_MONEY],
    statusCards: [],
    currentBid: [],
    hasPassed: false,
    isBot: false,
    ...overrides,
  };
}

export function gameState(
  players: HighSocietyPlayerState[],
  deck: string[],
  overrides: Partial<HighSocietyGameState["public"]> = {},
): HighSocietyGameState {
  return {
    public: {
      id: "lobby-1",
      game: "high-society",
      players,
      activePlayer: players[0].email,
      startAt: "0",
      status: "IN_PROGRESS",
      currentStatusCard: deck[0],
      remainingCards: deck.length - 1,
      ...overrides,
    },
    private: { deck: [...deck] },
  };
}
