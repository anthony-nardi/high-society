import Hand from "./Hand";
import classes from "./BidPanel.module.css";

/** The logged-in player's hand of money cards, fixed to the bottom of the screen. */
export default function BidPanel({
  cards,
  staged,
  onToggle,
  disabled,
}: {
  cards: string[];
  staged: string[];
  onToggle: (card: string) => void;
  disabled: boolean;
}) {
  return (
    <div className={classes.panel} data-testid="bid-panel">
      <Hand
        cards={cards}
        selected={staged}
        onToggle={onToggle}
        disabled={disabled}
      />
    </div>
  );
}
