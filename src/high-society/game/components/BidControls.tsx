import { useState } from "react";
import { Badge, Button, Group, Stack, Text } from "@mantine/core";
import cardInfo from "../cardInfo";
import displayName from "../../../shared/utils/displayName";

/** Pass / Bid actions with running totals and a confirm step on misfortune cards. */
export default function BidControls({
  isActive,
  activePlayer,
  currentCard,
  highestBidTotal,
  staged,
  currentTotal,
  proposedTotal,
  moneyTotal,
  canBid,
  loading,
  onBid,
  onPass,
}: {
  isActive: boolean;
  activePlayer: string;
  currentCard: string;
  highestBidTotal: number;
  staged: string[];
  currentTotal: number;
  proposedTotal: number;
  moneyTotal: number;
  canBid: boolean;
  loading: boolean;
  onBid: () => void;
  onPass: () => void;
}) {
  // The confirmation is tied to the card and turn it was opened for, so a
  // new card or losing the turn drops it without an effect.
  const confirmKey = `${currentCard}:${isActive}`;
  const [confirmingKey, setConfirmingKey] = useState<string | null>(null);
  const confirmingPass = confirmingKey === confirmKey;
  const setConfirmingPass = (value: boolean) =>
    setConfirmingKey(value ? confirmKey : null);
  const info = cardInfo(currentCard);
  const stagedTotal = proposedTotal - currentTotal;

  let hint: string;
  if (!isActive) {
    hint = `Waiting for ${displayName(activePlayer)}.`;
  } else if (staged.length === 0) {
    hint =
      highestBidTotal > 0
        ? `Highest bid is ${highestBidTotal}. Click cards to build your bid.`
        : "No bids yet. Click cards to build your bid.";
  } else if (proposedTotal > highestBidTotal) {
    hint = `${proposedTotal} beats ${highestBidTotal} by ${
      proposedTotal - highestBidTotal
    }. You would have ${moneyTotal - stagedTotal} money left.`;
  } else {
    hint = `${proposedTotal} does not beat the highest bid of ${highestBidTotal}. Add ${
      highestBidTotal - proposedTotal + 1
    } more.`;
  }

  const handlePass = () => {
    if (info.endsOnFirstPass && !confirmingPass) {
      setConfirmingPass(true);
      return;
    }
    setConfirmingPass(false);
    onPass();
  };

  return (
    <Stack gap={6} align="center">
      <Group gap="sm" justify="center" wrap="wrap">
        {isActive && (
          <Badge color="yellow" variant="filled" radius="sm" size="lg">
            Your turn
          </Badge>
        )}
        {confirmingPass ? (
          <>
            <Button
              color="red"
              disabled={!isActive || loading}
              loading={loading}
              onClick={handlePass}
            >
              Take the {info.name} ({currentCard})
            </Button>
            <Button
              variant="default"
              disabled={loading}
              onClick={() => setConfirmingPass(false)}
            >
              Keep bidding
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="default"
              disabled={!isActive || loading}
              loading={loading}
              onClick={handlePass}
            >
              Pass
            </Button>
            <Button disabled={!canBid} loading={loading} onClick={onBid}>
              {staged.length > 0 ? `Bid ${proposedTotal}` : "Bid"}
            </Button>
          </>
        )}
      </Group>
      <Text size="sm" c={confirmingPass ? "red.3" : "dimmed"} ta="center">
        {confirmingPass
          ? `Passing on a misfortune card means you take it. ${info.effect}. Everyone else loses their bid.`
          : hint}
      </Text>
    </Stack>
  );
}
