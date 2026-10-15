import { Badge } from "@mantine/core";
import { useMemo } from "react";
import { HighSocietyPlayerState } from "../types";

export default function PlayerRoundState({
  player,
}: {
  player: HighSocietyPlayerState;
}) {
  const renderedPlayerBid = useMemo(() => {
    if (!player.currentBid || player.currentBid.length === 0) return "0";

    const cardsCommited = player.currentBid.join(", ");

    const totalAmountBid = player.currentBid.reduce((sum, curr) => {
      return Number(sum) + Number(curr);
    }, 0);

    return `${cardsCommited} (total: ${totalAmountBid})`;
  }, [player.currentBid]);

  if (player.hasPassed) {
    return (
      <Badge color="gray" variant="light">
        Passed
      </Badge>
    );
  }

  return <div>Current bid: {renderedPlayerBid}</div>;
}
