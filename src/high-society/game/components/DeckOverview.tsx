import { Badge, Group, Stack, Text } from "@mantine/core";
import CardBack from "../../card/CardBack";
import CardFront from "../../card/CardFront";
import { HighSocietyGameState } from "../types";
import cardInfo, { GREEN_CARDS_TO_END } from "../cardInfo";

const KIND_COLOR = { luxury: "yellow", prestige: "green", misfortune: "red" };

export default function DeckOverview({
  deckInfo,
  greenRevealed,
}: {
  deckInfo: {
    currentStatusCard: HighSocietyGameState["currentStatusCard"];
    remainingCards: HighSocietyGameState["remainingCards"];
  } | null;
  greenRevealed: number;
}) {
  if (deckInfo === null) {
    return <></>;
  }

  const info = cardInfo(deckInfo.currentStatusCard);

  return (
    <Stack gap="sm" align="center" maw={420}>
      <Group gap="xs" wrap="nowrap" align="flex-start">
        <span>
          <CardBack cardsLeft={deckInfo.remainingCards} />
        </span>
        <span>
          <CardFront card={deckInfo.currentStatusCard} size="lg" />
        </span>
      </Group>

      <Group gap="xs" justify="center">
        <Badge color={KIND_COLOR[info.kind]} variant="filled" radius="sm">
          {info.name}
        </Badge>
        {info.isGreen && (
          <Badge color="green" variant="outline" radius="sm">
            Green edge
          </Badge>
        )}
        <Text fw={600}>{info.effect}</Text>
      </Group>

      <Text
        size="sm"
        ta="center"
        c={info.endsOnFirstPass ? "red.3" : "dimmed"}
        data-testid="card-rule"
      >
        {info.rule}
      </Text>

      <Text size="xs" c="dimmed" ta="center">
        Green cards revealed: {greenRevealed} of {GREEN_CARDS_TO_END}. The game
        ends when the {GREEN_CARDS_TO_END}th appears.
      </Text>
    </Stack>
  );
}
