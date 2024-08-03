import CardBack from "../../card/CardBack";
import CardFront from "../../card/CardFront";
import { GameState } from "../types";

export default function DeckOverview({
  deckInfo,
}: {
  deckInfo: {
    currentStatusCard: GameState["currentStatusCard"];
    remainingCards: GameState["remainingCards"];
  } | null;
}) {
  if (deckInfo === null) {
    return <></>;
  }
  return (
    <>
      <span>
        <CardBack cardsLeft={deckInfo.remainingCards} />
      </span>
      <span style={{ marginLeft: "4px" }}>
        <CardFront card={deckInfo.currentStatusCard} size="lg" />
      </span>
    </>
  );
}
