import { NoThanksGameState, NoThanksPlayerState } from "../../types";

export function player(
  email: string,
  overrides: Partial<NoThanksPlayerState> = {},
): NoThanksPlayerState {
  return {
    email,
    lastActionAt: 0,
    cards: [],
    chips: 11,
    isBot: false,
    ...overrides,
  };
}

export function gameState(
  players: NoThanksPlayerState[],
  deck: number[],
  overrides: Partial<NoThanksGameState["public"]> = {},
): NoThanksGameState {
  return {
    public: {
      id: "lobby-1",
      game: "no-thanks",
      players,
      activePlayer: players[0].email,
      startAt: "0",
      status: "IN_PROGRESS",
      activeCard: deck[0] ?? null,
      chipsPlaced: 0,
      // Matches revealNewActiveCard: the count includes the face-up card.
      remainingCards: deck.length,
      ...overrides,
    },
    private: { deck: [...deck] },
  };
}
