import { Group, Stack, Text } from "@mantine/core";
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

  const chips = deckInfo.chipsPlaced || 0;
  // remainingCards counts the face-up card.
  const faceDown = Math.max(0, deckInfo.remainingCards - 1);

  return (
    <Stack gap="sm" align="center" maw={420}>
      <Group gap="md" wrap="nowrap" align="center">
        <CardFront card={deckInfo.activeCard ?? 0} size="lg" />
        <Stack gap={4} align="center">
          <PokerChip number={chips} size={88} />
          <Text size="sm" fw={600}>
            {chips} chip{chips === 1 ? "" : "s"} on it
          </Text>
        </Stack>
      </Group>

      <Text size="sm" ta="center" c="dimmed" data-testid="card-rule">
        Take the {deckInfo.activeCard} and every chip on it, or pay one chip to
        pass it on. Cards score their face value, but a run of consecutive cards
        only counts its lowest card.
      </Text>

      <Text size="xs" c="dimmed" ta="center">
        {faceDown} card{faceDown === 1 ? "" : "s"} still face down. The game
        ends when the last card is taken.
      </Text>
    </Stack>
  );
}
