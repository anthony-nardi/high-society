import type { CSSProperties, ReactNode } from "react";
import { useViewportSize } from "@mantine/hooks";
import { fanWidthFor, handLayout } from "../handLayout";
import classes from "./FanHand.module.css";

export type FanHandItem = {
  key: string;
  /** Accessible name of the card. */
  label: string;
  /** The card's face, drawn to fill the card's width. */
  node: ReactNode;
  disabled?: boolean;
  title?: string;
};

/**
 * A hand of cards fanned along the bottom of the screen, as High Society
 * does with money: tapping a card lifts it into a straight tray above the
 * fan, tapping it again returns it. Any card face will do.
 */
export default function FanHand({
  items,
  selected,
  onToggle,
  disabled = false,
  minWidth = 54,
  maxWidth = 90,
  ratio = 1.48,
  trayLabel,
  ariaLabel = "Your hand",
}: {
  items: FanHandItem[];
  /** Keys in the tray, in the order they were chosen. */
  selected: string[];
  onToggle: (key: string) => void;
  disabled?: boolean;
  /** Card width in px, grown with the viewport between these bounds. */
  minWidth?: number;
  maxWidth?: number;
  /** Height over width. */
  ratio?: number;
  /** Caption over the tray while something is in it. */
  trayLabel?: string;
  ariaLabel?: string;
}) {
  const { width: viewportWidth } = useViewportSize();
  const vw = viewportWidth || 1024;
  const cardWidth = Math.round(
    Math.min(maxWidth, Math.max(minWidth, vw * 0.08)),
  );
  const cardHeight = Math.round(cardWidth * ratio);
  const fanWidth = fanWidthFor(vw, cardWidth);
  const fanned = items.filter((item) => !selected.includes(item.key));
  const trayCentre = (selected.length - 1) / 2;

  return (
    <div
      className={classes.hand}
      role="group"
      aria-label={ariaLabel}
      style={
        {
          "--fh-w": `${cardWidth}px`,
          "--fh-h": `${cardHeight}px`,
          "--tray-count": Math.max(selected.length, 1),
        } as CSSProperties
      }
    >
      {selected.length > 0 && trayLabel && (
        <div className={classes.trayLabel}>{trayLabel}</div>
      )}
      {items.map((item) => {
        const trayIndex = selected.indexOf(item.key);
        const isSelected = trayIndex !== -1;
        let style: CSSProperties;
        if (isSelected) {
          style = {
            "--slot": trayIndex - trayCentre,
            "--slot-index": trayIndex,
          } as CSSProperties;
        } else {
          const index = fanned.indexOf(item);
          const { x, y, rotate } = handLayout(fanned.length, index, fanWidth);
          style = {
            "--x": `${x}px`,
            "--y": `${y}px`,
            "--r": `${rotate}deg`,
            zIndex: index,
          } as CSSProperties;
        }
        return (
          <button
            key={item.key}
            type="button"
            className={`${classes.card} ${isSelected ? classes.selected : ""}`}
            style={style}
            disabled={disabled || item.disabled}
            aria-pressed={isSelected}
            aria-label={item.label}
            title={item.title}
            onClick={() => onToggle(item.key)}
          >
            {item.node}
          </button>
        );
      })}
    </div>
  );
}
