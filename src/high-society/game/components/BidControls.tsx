import { Button, Group, Stack, Text } from "@mantine/core";

/** Pass / Bid actions with a one-line explanation of the current auction state. */
export default function BidControls({
  isActive,
  activePlayer,
  highestBidTotal,
  staged,
  currentTotal,
  proposedTotal,
  canBid,
  loading,
  onBid,
  onPass,
}: {
  isActive: boolean;
  activePlayer: string;
  highestBidTotal: number;
  staged: string[];
  currentTotal: number;
  proposedTotal: number;
  canBid: boolean;
  loading: boolean;
  onBid: () => void;
  onPass: () => void;
}) {
  let hint: string;
  if (!isActive) {
    hint = `Waiting for ${activePlayer.split("@")[0]}.`;
  } else if (staged.length === 0) {
    hint = `Highest bid is ${highestBidTotal}. Click cards in your hand to build a bid.`;
  } else if (proposedTotal > highestBidTotal) {
    hint = `Your bid would be ${proposedTotal} (${staged.join(" + ")}${
      currentTotal ? ` on top of ${currentTotal}` : ""
    }).`;
  } else {
    hint = `${proposedTotal} does not beat the highest bid of ${highestBidTotal}.`;
  }

  return (
    <Stack gap="xs" align="center" mt="md">
      <Group gap="sm">
        <Button
          variant="default"
          disabled={!isActive || loading}
          loading={loading}
          onClick={onPass}
        >
          Pass
        </Button>
        <Button disabled={!canBid} loading={loading} onClick={onBid}>
          {staged.length > 0 ? `Bid ${proposedTotal}` : "Bid"}
        </Button>
      </Group>
      <Text size="sm" c="dimmed" ta="center">
        {hint}
      </Text>
    </Stack>
  );
}
