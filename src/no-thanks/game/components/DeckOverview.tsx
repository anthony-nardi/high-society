import { Box } from "@mantine/core";
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
      <Box>Remaining Cards : {deckInfo.remainingCards}</Box>
      <Box style={{ marginLeft: "4px" }} mt="sm">
        <CardFront card={deckInfo.activeCard} size="lg" />
      </Box>
      <PokerChip number={deckInfo.chipsPlaced || 0} />
    </>
  );
}
