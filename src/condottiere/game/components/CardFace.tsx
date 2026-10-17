import { CSSProperties } from "react";
import { Card } from "../types";
import { CARD_HELP, CARD_LABEL, isMercenary, mercenaryValue } from "../board";

const SPECIAL: { [card: string]: { fill: string; mark: string } } = {
  DRUMMER: { fill: "#8a4b2f", mark: "♫" },
  HEROINE: { fill: "#b8862b", mark: "♛" },
  SPRING: { fill: "#3f8f45", mark: "❀" },
  WINTER: { fill: "#4a7fb5", mark: "❄" },
  SURRENDER: { fill: "#8d8d8d", mark: "⚑" },
  BISHOP: { fill: "#6d3f8f", mark: "✝" },
  SCARECROW: { fill: "#9a8a3c", mark: "☗" },
  COURTESAN: { fill: "#c23b6b", mark: "✿" },
};

/** A card: mercenaries show a shield with their strength, specials a symbol. */
export default function CardFace({
  card,
  width = 54,
  selected = false,
  dimmed = false,
  onClick,
  style,
}: {
  card: Card;
  width?: number;
  selected?: boolean;
  dimmed?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
}) {
  const height = Math.round(width * (80 / 54));
  const merc = isMercenary(card);
  const special = SPECIAL[card];
  return (
    <svg
      viewBox="0 0 54 80"
      width={width}
      height={height}
      role={onClick ? "button" : "img"}
      aria-label={`${CARD_LABEL[card]}${selected ? " (selected)" : ""}`}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) onClick();
      }}
      style={{
        display: "block",
        flex: "0 0 auto",
        cursor: onClick ? "pointer" : "default",
        opacity: dimmed ? 0.45 : 1,
        transform: selected ? "translateY(-6px)" : undefined,
        transition: "transform 120ms, opacity 150ms",
        filter: selected
          ? "drop-shadow(0 0 6px rgba(255, 216, 107, 0.8))"
          : "drop-shadow(0 2px 3px rgba(0,0,0,0.45))",
        ...style,
      }}
    >
      <title>{CARD_HELP[card]}</title>
      <rect
        x="1"
        y="1"
        width="52"
        height="78"
        rx="6"
        fill={merc ? "#f3e9d2" : special.fill}
        stroke={selected ? "#ffd86b" : "#2a2a2a"}
        strokeWidth={selected ? 3 : 1.5}
      />
      {merc ? (
        <>
          <path
            d="M27 14 L41 20 L39 44 L27 56 L15 44 L13 20 Z"
            fill="#8c2f2f"
            stroke="#4a1414"
            strokeWidth="1.5"
          />
          <text
            x="27"
            y="40"
            textAnchor="middle"
            fontSize={mercenaryValue(card) >= 10 ? 16 : 20}
            fontWeight="800"
            fill="#fff"
          >
            {mercenaryValue(card)}
          </text>
          <text
            x="27"
            y="70"
            textAnchor="middle"
            fontSize="7"
            fill="#5a4a2a"
            letterSpacing="0.5"
          >
            MERCENARY
          </text>
        </>
      ) : (
        <>
          <circle
            cx="27"
            cy="34"
            r="16"
            fill="rgba(255,255,255,0.18)"
            stroke="rgba(255,255,255,0.6)"
          />
          <text x="27" y="41" textAnchor="middle" fontSize="20" fill="#fff">
            {special.mark}
          </text>
          <text
            x="27"
            y="70"
            textAnchor="middle"
            fontSize={card.length > 8 ? 6 : 7}
            fontWeight="700"
            fill="#fff"
            letterSpacing="0.5"
          >
            {CARD_LABEL[card].toUpperCase()}
          </text>
        </>
      )}
    </svg>
  );
}
