export type ScoredPlayer = {
  email: string;
  moneyCards: string[];
  statusCards: string[];
  /** Sum of luxury cards before multipliers. */
  luxury: number;
  /** Points lost to the Scandal card, before multipliers. */
  penalty: number;
  /** Combined effect of Recognition (×2) and Mansion fire (×½). */
  multiplier: number;
  finalScore: number;
  moneyLeft: number;
  /** Poorest player(s) at the end are out of the running. */
  eliminated: boolean;
  winner: boolean;
  rank: number;
};

type PlayerLike = {
  email: string;
  moneyCards?: string[];
  statusCards?: string[];
};

const sum = (cards: string[]) =>
  cards.reduce((total, card) => total + Number(card), 0);

function score(player: PlayerLike) {
  const statusCards = player.statusCards || [];
  let luxury = 0;
  let penalty = 0;
  let multiplier = 1;

  for (const card of statusCards) {
    if (card === "2x") multiplier *= 2;
    else if (card === "1/2") multiplier /= 2;
    else if (card === "-5") penalty += 5;
    else if (card !== "-") luxury += Number(card);
  }

  return {
    luxury,
    penalty,
    multiplier,
    finalScore: (luxury - penalty) * multiplier,
  };
}

/** Highest luxury card held, for the final tie-break. */
function topLuxury(cards: string[]) {
  return Math.max(0, ...cards.map(Number).filter((n) => n >= 1 && n <= 10));
}

/**
 * Ranks every player: the poorest are eliminated, then the highest score
 * wins; ties go to the most money left, then the highest luxury card.
 */
export default function scoreGame(players: PlayerLike[]): ScoredPlayer[] {
  const scored = players.map((player) => {
    const moneyCards = player.moneyCards || [];
    return {
      email: player.email,
      moneyCards,
      statusCards: player.statusCards || [],
      moneyLeft: sum(moneyCards),
      ...score(player),
    };
  });

  const leastMoney = Math.min(...scored.map((p) => p.moneyLeft));

  const ordered = [...scored].sort((a, b) => {
    const aOut = a.moneyLeft === leastMoney ? 1 : 0;
    const bOut = b.moneyLeft === leastMoney ? 1 : 0;
    if (aOut !== bOut) return aOut - bOut;
    if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
    if (b.moneyLeft !== a.moneyLeft) return b.moneyLeft - a.moneyLeft;
    return topLuxury(b.statusCards) - topLuxury(a.statusCards);
  });

  const first = ordered[0];
  return ordered.map((player, index) => {
    const eliminated = player.moneyLeft === leastMoney;
    const winner =
      !eliminated &&
      player.finalScore === first.finalScore &&
      player.moneyLeft === first.moneyLeft &&
      topLuxury(player.statusCards) === topLuxury(first.statusCards);
    return { ...player, eliminated, winner, rank: index + 1 };
  });
}
