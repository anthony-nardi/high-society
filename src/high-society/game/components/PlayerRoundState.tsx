import { Badge, Group, Text } from "@mantine/core";
import { HighSocietyPlayerState } from "../types";
import MoneyCard from "../../card/MoneyCard";

const sum = (cards: string[]) =>
  cards.reduce((total, card) => total + Number(card), 0);

/** The player's bid as a row of small money cards, flagged when it leads. */
export default function PlayerRoundState({
  player,
  highestBidTotal,
}: {
  player: HighSocietyPlayerState;
  highestBidTotal: number;
}) {
  if (player.hasPassed) {
    return (
      <Badge color="gray" variant="light">
        Passed
      </Badge>
    );
  }

  const bid = player.currentBid || [];
  const total = sum(bid);

  if (bid.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        No bid yet
      </Text>
    );
  }

  const leading = total > 0 && total === highestBidTotal;

  return (
    <Group gap="xs" align="center" wrap="wrap">
      <Group
        gap={2}
        wrap="nowrap"
        role="img"
        aria-label={`Bid of ${bid.join(" + ")}`}
      >
        {bid.map((card) => (
          <div key={card} style={{ width: 34, flex: "0 0 auto" }}>
            <MoneyCard value={card} />
          </div>
        ))}
      </Group>
      <Badge
        color={leading ? "yellow" : "gray"}
        variant={leading ? "filled" : "light"}
        radius="sm"
      >
        {leading ? `Leads with ${total}` : `Bid ${total}`}
      </Badge>
    </Group>
  );
}
