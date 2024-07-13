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
      <div>Remaining Cards: {deckInfo.remainingCards}</div>
      <div>Current Card: {deckInfo.currentStatusCard}</div>
    </>
  );
}
