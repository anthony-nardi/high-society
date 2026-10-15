import type { CSSProperties } from "react";
import MoneyCard from "../../card/MoneyCard";
import { useViewportSize } from "@mantine/hooks";
import { fanWidthFor, handLayout } from "./handLayout";
import classes from "./Hand.module.css";

export default function Hand({
  cards,
  selected,
  onToggle,
  disabled = false,
}: {
  cards: string[];
  selected: string[];
  onToggle: (card: string) => void;
  disabled?: boolean;
}) {
  const sorted = [...cards].sort((a, b) => Number(a) - Number(b));
  const fanned = sorted.filter((card) => !selected.includes(card));
  const trayCentre = (selected.length - 1) / 2;
  const { width: viewportWidth } = useViewportSize();
  // Mirrors --hs-card-w in App.css: clamp(60px, 8vw, 100px).
  const cardWidth = Math.min(100, Math.max(60, viewportWidth * 0.08));
  const fanWidth = fanWidthFor(viewportWidth || 1024, cardWidth);

  return (
    <div
      className={classes.hand}
      role="group"
      aria-label="Your money cards"
      style={{ "--tray-count": Math.max(selected.length, 1) } as CSSProperties}
    >
      {selected.length > 0 && <div className={classes.trayLabel}>Your bid</div>}
      {sorted.map((card) => {
        const trayIndex = selected.indexOf(card);
        const isSelected = trayIndex !== -1;

        let style: CSSProperties;
        if (isSelected) {
          style = {
            "--slot": trayIndex - trayCentre,
            "--slot-index": trayIndex,
          } as CSSProperties;
        } else {
          const { x, y, rotate } = handLayout(
            fanned.length,
            fanned.indexOf(card),
            fanWidth,
          );
          style = {
            "--x": `${x}px`,
            "--y": `${y}px`,
            "--r": `${rotate}deg`,
            zIndex: fanned.indexOf(card),
          } as CSSProperties;
        }

        return (
          <button
            key={card}
            type="button"
            className={`${classes.card} ${isSelected ? classes.selected : ""}`}
            style={style}
            disabled={disabled}
            aria-pressed={isSelected}
            aria-label={`Money card ${card}`}
            title={
              isSelected
                ? "Click to return to your hand"
                : "Click to add to bid"
            }
            onClick={() => onToggle(card)}
          >
            <MoneyCard value={card} />
          </button>
        );
      })}
    </div>
  );
}
