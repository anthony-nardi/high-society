import BidControls from "./BidControls";
import Hand from "./Hand";
import type { CSSProperties } from "react";
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
  currentCard,
  highestBidTotal,
  currentTotal,
  proposedTotal,
  moneyTotal,
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
  currentCard: string;
  highestBidTotal: number;
  currentTotal: number;
  proposedTotal: number;
  moneyTotal: number;
  canBid: boolean;
  loading: boolean;
  onToggle: (card: string) => void;
  onBid: () => void;
  onPass: () => void;
}) {
  return (
    <div
      className={`${classes.panel} ${isActive ? classes.active : ""}`}
      data-testid="bid-panel"
    >
      <div
        className={classes.stage}
        style={{ "--tray-count": Math.max(staged.length, 1) } as CSSProperties}
      >
        <div className={classes.controls}>
          <BidControls
            isActive={isActive}
            activePlayer={activePlayer}
            currentCard={currentCard}
            highestBidTotal={highestBidTotal}
            staged={staged}
            currentTotal={currentTotal}
            proposedTotal={proposedTotal}
            moneyTotal={moneyTotal}
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
    </div>
  );
}
