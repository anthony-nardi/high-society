import { Button, Text } from "@mantine/core";
import { useCallback, useState } from "react";
import bid from "../../client/bid";
import passTurn from "../../client/passTurn";
import { useLobbyContext } from "../../../shared/context/useLobbyContext";
import { HighSocietyPlayerState } from "../types";
import Hand from "./Hand";
import classes from "./BidPanel.module.css";

const sum = (cards: string[]) =>
  cards.reduce((total, card) => total + Number(card), 0);

/**
 * The logged-in player's hand of money cards with the Pass / Bid controls
 * above it. Click cards to stage them, then press Bid.
 */
export default function BidPanel({
  player,
  isActive,
  activePlayer,
  highestBidTotal,
}: {
  player: HighSocietyPlayerState;
  isActive: boolean;
  activePlayer: string;
  highestBidTotal: number;
}) {
  const { lobbyId } = useLobbyContext();
  const [staged, setStaged] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const moneyCards = player.moneyCards || [];
  // Cards leave the hand once a bid resolves, so only count staged cards
  // that are still held.
  const stagedInHand = staged.filter((card) => moneyCards.includes(card));

  const currentTotal = sum(player.currentBid || []);
  const stagedTotal = sum(stagedInHand);
  const proposedTotal = currentTotal + stagedTotal;
  const canBid =
    isActive &&
    !loading &&
    stagedInHand.length > 0 &&
    proposedTotal > highestBidTotal;

  const toggleCard = useCallback((card: string) => {
    setStaged((previous) =>
      previous.includes(card)
        ? previous.filter((c) => c !== card)
        : [...previous, card]
    );
  }, []);

  const handleBid = useCallback(async () => {
    setLoading(true);
    await bid({ lobbyUID: lobbyId || 0, bid: stagedInHand });
    setStaged([]);
    setLoading(false);
  }, [lobbyId, stagedInHand]);

  const handlePass = useCallback(async () => {
    setLoading(true);
    setStaged([]);
    await passTurn({ lobbyUID: lobbyId || 0 });
    setLoading(false);
  }, [lobbyId]);

  let hint: string;
  if (!isActive) {
    hint = `Waiting for ${activePlayer.split("@")[0]}`;
  } else if (stagedInHand.length === 0) {
    hint = `Highest bid is ${highestBidTotal}. Click cards to build your bid.`;
  } else if (proposedTotal > highestBidTotal) {
    hint = `Your bid would be ${proposedTotal} (${stagedInHand.join(" + ")}${
      currentTotal ? ` on top of ${currentTotal}` : ""
    }).`;
  } else {
    hint = `${proposedTotal} does not beat the highest bid of ${highestBidTotal}.`;
  }

  return (
    <div className={classes.panel} data-testid="bid-panel">
      <div className={classes.controls}>
        <Button
          variant="default"
          disabled={!isActive || loading}
          loading={loading}
          onClick={handlePass}
        >
          Pass
        </Button>
        <Button disabled={!canBid} loading={loading} onClick={handleBid}>
          {stagedInHand.length > 0 ? `Bid ${proposedTotal}` : "Bid"}
        </Button>
        <Text size="sm" c="dimmed">
          {hint}
        </Text>
      </div>
      <Hand
        cards={moneyCards}
        selected={stagedInHand}
        onToggle={toggleCard}
        disabled={!isActive || loading}
      />
    </div>
  );
}
