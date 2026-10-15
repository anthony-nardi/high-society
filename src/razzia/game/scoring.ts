import { RazziaPlayerState, ScoreBreakdown } from "./types";

export type ScoredPlayer = {
  email: string;
  score: number;
  /** Per round totals, index 0 is round 1; the last entry is final scoring. */
  rounds: number[];
  breakdowns: ScoreBreakdown[];
  winner: boolean;
  rank: number;
};

/** Ranks players by the server-computed score; ties share the win. */
export default function scoreGame(
  players: RazziaPlayerState[],
  scoring: ScoreBreakdown[] = [],
): ScoredPlayer[] {
  const scored = players.map((player) => {
    const breakdowns = scoring.filter((b) => b.email === player.email);
    const rounds: number[] = [];
    for (const breakdown of breakdowns) {
      rounds.push(breakdown.total);
    }
    return {
      email: player.email,
      score: player.score || 0,
      rounds,
      breakdowns,
    };
  });

  const ordered = [...scored].sort((a, b) => b.score - a.score);
  const best = ordered[0]?.score;

  return ordered.map((player, index) => ({
    ...player,
    winner: player.score === best,
    rank: index + 1,
  }));
}

/** Pretty label for a scoring category key from the server. */
export function categoryLabel(key: string) {
  switch (key) {
    case "jewels":
      return "Jewels";
    case "bodyguards":
      return "Bodyguards";
    case "coins":
      return "Coins";
    case "cars":
      return "Cars";
    case "drivers":
      return "Drivers";
    case "thieves":
      return "Thieves";
    case "businesses":
      return "Businesses";
    case "money":
      return "Money";
    default:
      return key;
  }
}
