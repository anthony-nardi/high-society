export type PlayerState = {
  email: string;
  lastActionAt: number;
  moneyCards: string[];
  statusCards: string[];
  currentBid: string[];
  hasPassed: boolean;
};

export type GameState = {
  id: string;
  game: string;
  players: PlayerState[];
  activePlayer: string;
  startAt: string;
  status: string;
  currentStatusCard: string;
  remainingCards: number;
};
