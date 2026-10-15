import { LootCards, RazziaGameState, RazziaPlayerState } from "../../types";
import { emptyCards } from "../rules";

export function player(
  email: string,
  overrides: Partial<RazziaPlayerState> = {}
): RazziaPlayerState {
  const money = overrides.money || ["2", "5", "8", "13"];
  return {
    email,
    lastActionAt: 0,
    cards: emptyCards(),
    money,
    availableMoney: overrides.availableMoney || [...money],
    bid: "0",
    score: 0,
    isBot: false,
    ...overrides,
  };
}

export function gameState(
  players: RazziaPlayerState[],
  deck: LootCards[],
  overrides: Partial<RazziaGameState["public"]> = {}
): RazziaGameState {
  return {
    public: {
      id: "lobby-1",
      game: "razzia",
      players,
      activePlayer: players[0].email,
      startAt: "0",
      status: "IN_PROGRESS",
      roundState: "ACTION",
      money: "1",
      revealedCards: [],
      policeRaids: 0,
      raidLimit: 6,
      remainingCards: deck.length,
      round: 1,
      ...overrides,
    },
    private: { deck: [...deck], log: [] },
  };
}
