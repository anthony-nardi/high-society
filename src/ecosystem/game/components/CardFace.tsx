import { CSSProperties } from "react";
import { CardType } from "../types";
import { CARD_INFO, label } from "../board";

/** A card: its creature or landform on a tinted tile. */
export default function CardFace({
  type,
  size = 56,
  style,
  faded = false,
  highlight,
}: {
  type: CardType;
  size?: number;
  style?: CSSProperties;
  faded?: boolean;
  highlight?: "new" | "swap" | "selected";
}) {
  const info = CARD_INFO[type];
  return (
    <div
      role="img"
      aria-label={label(type)}
      title={`${label(type)}: ${info.rule}`}
      style={{
        width: size,
        height: Math.round(size * 1.3),
        borderRadius: Math.max(5, size * 0.12),
        background: `linear-gradient(160deg, ${info.colour} 0%, ${info.colour}bb 100%)`,
        border:
          highlight === "selected" || highlight === "swap"
            ? "3px solid #ffd86b"
            : "1.5px solid rgba(0,0,0,0.45)",
        boxShadow: highlight
          ? "0 0 10px rgba(255,216,107,0.8)"
          : "0 2px 4px rgba(0,0,0,0.4)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        opacity: faded ? 0.5 : 1,
        color: "#1a1a1a",
        userSelect: "none",
        ...style,
      }}
    >
      <span style={{ fontSize: size * 0.5, lineHeight: 1 }} aria-hidden="true">
        {info.emoji}
      </span>
      <span
        style={{
          fontSize: Math.max(8, size * 0.18),
          fontWeight: 800,
          letterSpacing: 0.3,
        }}
      >
        {label(type)}
      </span>
    </div>
  );
}
