export type ScoredPlayer = {
  email: string;
  cards: number[];
  /** Cards grouped into consecutive runs, lowest first. */
  runs: number[][];
  chips: number;
  /** Sum of the lowest card of each run. */
  cardPoints: number;
  /** cardPoints minus chips: lowest wins. */
  score: number;
  winner: boolean;
  rank: number;
};

type PlayerLike = { email: string; cards?: number[]; chips: number };

/** Groups sorted cards into runs of consecutive numbers. */
export function groupRuns(cards: number[]): number[][] {
  const sorted = [...cards].sort((a, b) => a - b);
  const runs: number[][] = [];
  for (const card of sorted) {
    const last = runs[runs.length - 1];
    if (last && last[last.length - 1] === card - 1) {
      last.push(card);
    } else {
      runs.push([card]);
    }
  }
  return runs;
}

/** Official scoring: each run counts its lowest card. */
export function cardPoints(cards: number[]) {
  return groupRuns(cards).reduce((total, run) => total + run[0], 0);
}

/**
 * What taking the card would do to the player's score, before chips.
 * `pointsAdded` is negative when the card bridges two runs.
 */
export function takeOutcome(
  card: number,
  chipsPlaced: number,
  cards: number[],
) {
  const pointsAdded = cardPoints([...cards, card]) - cardPoints(cards);
  return {
    pointsAdded,
    net: pointsAdded - chipsPlaced,
    joinsRun: pointsAdded < card,
    bridgesRuns: pointsAdded < 0,
  };
}

/** Ranks every player, lowest score first; equal lowest scores share the win. */
export default function scoreGame(players: PlayerLike[]): ScoredPlayer[] {
  const scored = players.map((player) => {
    const cards = player.cards || [];
    const points = cardPoints(cards);
    return {
      email: player.email,
      cards: [...cards].sort((a, b) => a - b),
      runs: groupRuns(cards),
      chips: player.chips || 0,
      cardPoints: points,
      score: points - (player.chips || 0),
    };
  });

  const ordered = [...scored].sort((a, b) => a.score - b.score);
  const best = ordered[0]?.score;

  return ordered.map((player, index) => ({
    ...player,
    winner: player.score === best,
    rank: index + 1,
  }));
}
