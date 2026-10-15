import BidControls from "./BidControls";
import Hand from "./Hand";
import classes from "./BidPanel.module.css";

/**
 * Fixed strip along the bottom of the screen: Pass / Bid controls centred
 * above the bid tray, with the fan of money cards underneath.
 */
export default function BidPanel({
  cards,
  staged,
  isActive,
  activePlayer,
  highestBidTotal,
  currentTotal,
  proposedTotal,
  canBid,
  loading,
  onToggle,
  onBid,
  onPass,
}: {
  cards: string[];
  staged: string[];
  isActive: boolean;
  activePlayer: string;
  highestBidTotal: number;
  currentTotal: number;
  proposedTotal: number;
  canBid: boolean;
  loading: boolean;
  onToggle: (card: string) => void;
  onBid: () => void;
  onPass: () => void;
}) {
  return (
    <div className={classes.panel} data-testid="bid-panel">
      <div className={classes.controls}>
        <BidControls
          isActive={isActive}
          activePlayer={activePlayer}
          highestBidTotal={highestBidTotal}
          staged={staged}
          currentTotal={currentTotal}
          proposedTotal={proposedTotal}
          canBid={canBid}
          loading={loading}
          onBid={onBid}
          onPass={onPass}
        />
      </div>
      <Hand
        cards={cards}
        selected={staged}
        onToggle={onToggle}
        disabled={!isActive || loading}
      />
    </div>
  );
}
