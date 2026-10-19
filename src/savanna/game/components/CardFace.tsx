import { CSSProperties } from "react";
import { CardType } from "../types";
import { CARD_INFO, label } from "../board";

/** A card: its creature or landform on a tinted tile, or its back when a hunter flipped it. */
export default function CardFace({
  type,
  size = 56,
  style,
  faded = false,
  down = false,
  highlight,
}: {
  type: CardType;
  size?: number;
  style?: CSSProperties;
  faded?: boolean;
  down?: boolean;
  highlight?: "new" | "selected";
}) {
  const info = CARD_INFO[type];
  return (
    <div
      role="img"
      aria-label={down ? `${label(type)} (facedown)` : label(type)}
      title={`${label(type)}: ${info.rule}`}
      style={{
        width: size,
        height: Math.round(size * 1.3),
        borderRadius: Math.max(5, size * 0.12),
        background: down
          ? "repeating-linear-gradient(135deg, #4a3a2a 0 6px, #5a4636 6px 12px)"
          : `linear-gradient(160deg, ${info.colour} 0%, ${info.colour}bb 100%)`,
        border:
          highlight === "selected"
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
        color: down ? "#e8d8c8" : "#1a1a1a",
        userSelect: "none",
        ...style,
      }}
    >
      <span
        style={{
          fontSize: size * 0.5,
          lineHeight: 1,
          opacity: down ? 0.35 : 1,
        }}
        aria-hidden="true"
      >
        {info.emoji}
      </span>
      <span
        style={{
          fontSize: Math.max(8, size * 0.17),
          fontWeight: 800,
          letterSpacing: 0.3,
          textAlign: "center",
          lineHeight: 1.05,
        }}
      >
        {down ? "facedown" : label(type)}
      </span>
    </div>
  );
}
