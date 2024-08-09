import CardFront from "../../card/CardFront";
import PokerChip from "../../poker-chip/PokerChip";
import { NoThanksGameState } from "../types";

export default function DeckOverview({
  deckInfo,
}: {
  deckInfo: {
    activeCard: NoThanksGameState["activeCard"];
    remainingCards: NoThanksGameState["remainingCards"];
    chipsPlaced: NoThanksGameState["chipsPlaced"];
  } | null;
}) {
  if (deckInfo === null) {
    return <></>;
  }
  return (
    <>
      <span>Remaining Cards : {deckInfo.remainingCards}</span>
      <span style={{ marginLeft: "4px" }}>
        <CardFront card={deckInfo.activeCard} size="lg" />
      </span>
      <div>Chips Placed: {deckInfo.chipsPlaced}</div>
      <PokerChip number={deckInfo.chipsPlaced || 0} />
    </>
  );
}
