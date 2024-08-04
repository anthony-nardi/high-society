import { NoThanksGameState } from "../types";

export default function DeckOverview({
  deckInfo,
}: {
  deckInfo: {
    activeCard: NoThanksGameState["activeCard"];
    remainingCards: NoThanksGameState["remainingCards"];
  } | null;
}) {
  if (deckInfo === null) {
    return <></>;
  }
  return (
    <>
      <span>Remaining Cards : {deckInfo.remainingCards}</span>
      <span style={{ marginLeft: "4px" }}>
        Active Card: {deckInfo.activeCard}
      </span>
    </>
  );
}
