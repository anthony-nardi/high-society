import { useCallback, useState } from "react";
import bid from "../../client/bid";
import passTurn from "../../client/passTurn";
import { useLobbyContext } from "../../../shared/context/useLobbyContext";
import { HighSocietyPlayerState } from "../types";

const sum = (cards: string[]) =>
  cards.reduce((total, card) => total + Number(card), 0);

/**
 * Staged-bid state for the logged-in player, shared between the action bar
 * (Pass / Bid) and the hand of money cards.
 */
export default function useBidding({
  player,
  isActive,
  highestBidTotal,
}: {
  player: HighSocietyPlayerState;
  isActive: boolean;
  highestBidTotal: number;
}) {
  const { lobbyId } = useLobbyContext();
  const [staged, setStaged] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const moneyCards = player.moneyCards || [];
  // Cards leave the hand once a bid resolves, so only count staged cards
  // that are still held.
  const stagedInHand = staged.filter((card) => moneyCards.includes(card));

  const moneyTotal = sum(moneyCards);
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
        : [...previous, card],
    );
  }, []);

  const submitBid = useCallback(async () => {
    setLoading(true);
    await bid({ lobbyUID: lobbyId || 0, bid: stagedInHand });
    setStaged([]);
    setLoading(false);
  }, [lobbyId, stagedInHand]);

  const pass = useCallback(async () => {
    setLoading(true);
    setStaged([]);
    await passTurn({ lobbyUID: lobbyId || 0 });
    setLoading(false);
  }, [lobbyId]);

  return {
    moneyCards,
    moneyTotal,
    staged: stagedInHand,
    currentTotal,
    proposedTotal,
    canBid,
    loading,
    toggleCard,
    submitBid,
    pass,
  };
}
