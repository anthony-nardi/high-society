export type CardKind = "luxury" | "prestige" | "misfortune";

export type CardInfo = {
  kind: CardKind;
  name: string;
  /** Short effect, e.g. "+7 points". */
  effect: string;
  /** How this card's auction plays out. */
  rule: string;
  /** Green-edged cards: the fourth one revealed ends the game. */
  isGreen: boolean;
  /** The first player to pass takes the card; everyone else loses their bid. */
  endsOnFirstPass: boolean;
};

export const GREEN_CARDS = ["2x", "1/2"];
export const GREEN_CARDS_TO_END = 4;

const NORMAL_RULE =
  "Highest bid wins the card and pays their bid. Passing returns your money.";
const MISFORTUNE_RULE =
  "The first player to pass takes this card and keeps their money. Everyone else loses what they have bid.";

export default function cardInfo(card: string): CardInfo {
  switch (card) {
    case "2x":
      return {
        kind: "prestige",
        name: "Recognition",
        effect: "Doubles your score",
        rule: NORMAL_RULE,
        isGreen: true,
        endsOnFirstPass: false,
      };
    case "1/2":
      return {
        kind: "misfortune",
        name: "Mansion fire",
        effect: "Halves your score",
        rule: MISFORTUNE_RULE,
        isGreen: true,
        endsOnFirstPass: true,
      };
    case "-5":
      return {
        kind: "misfortune",
        name: "Scandal",
        effect: "−5 points",
        rule: MISFORTUNE_RULE,
        isGreen: false,
        endsOnFirstPass: true,
      };
    case "-":
      return {
        kind: "misfortune",
        name: "Thief",
        effect: "Discards your lowest luxury card, or the next one you win",
        rule: MISFORTUNE_RULE,
        isGreen: false,
        endsOnFirstPass: true,
      };
    default:
      return {
        kind: "luxury",
        name: "Luxury",
        effect: `+${card} point${card === "1" ? "" : "s"}`,
        rule: NORMAL_RULE,
        isGreen: false,
        endsOnFirstPass: false,
      };
  }
}

/** Green cards already out of the deck, counting the one on the table. */
export function greenCardsRevealed(
  players: { statusCards?: string[] }[],
  currentCard: string
) {
  const held = players.reduce(
    (count, player) =>
      count +
      (player.statusCards || []).filter((card) => GREEN_CARDS.includes(card))
        .length,
    0
  );
  return held + (GREEN_CARDS.includes(currentCard) ? 1 : 0);
}
