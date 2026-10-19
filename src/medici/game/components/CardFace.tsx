import { CSSProperties } from "react";
import { cardLabel, COMMODITY_INFO, commodityOf, valueOf } from "../board";
import type { Card } from "../types";

/*
 * A Medici commodity card: the value large over a field in the commodity's
 * colour, its emblem above and its name along the foot. The gold card has
 * a sunburst.
 */
export default function CardFace({
  card,
  width = 110,
  dimmed = false,
  decorative = false,
  style,
  className,
}: {
  card: Card;
  width?: number;
  dimmed?: boolean;
  /** Inside a labelled element: no name of its own. */
  decorative?: boolean;
  style?: CSSProperties;
  className?: string;
}) {
  const commodity = commodityOf(card);
  const value = valueOf(card);
  const info = COMMODITY_INFO[commodity];
  const height = Math.round(width * (150 / 110));
  const gold = commodity === "GOLD";

  return (
    <svg
      viewBox="0 0 110 150"
      width={width}
      height={height}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : cardLabel(card)}
      className={className}
      style={{
        display: "block",
        flex: "0 0 auto",
        opacity: dimmed ? 0.45 : 1,
        transition: "opacity 150ms",
        filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.45))",
        ...style,
      }}
    >
      <rect
        x="1"
        y="1"
        width="108"
        height="148"
        rx="10"
        fill="#f3ead8"
        stroke="#3a3a3a"
        strokeWidth="2"
      />
      <rect
        x="7"
        y="7"
        width="96"
        height="118"
        rx="6"
        fill={info.colour}
        stroke="rgba(0,0,0,0.25)"
        strokeWidth="1"
      />
      {gold && (
        <g opacity="0.55">
          {Array.from({ length: 12 }, (_, i) => (
            <line
              key={i}
              x1="55"
              y1="66"
              x2={55 + 70 * Math.cos((i * Math.PI) / 6)}
              y2={66 + 70 * Math.sin((i * Math.PI) / 6)}
              stroke="#fff6d0"
              strokeWidth="4"
            />
          ))}
        </g>
      )}
      <text
        x="55"
        y="34"
        textAnchor="middle"
        fontSize="20"
        style={{ fontFamily: "inherit" }}
      >
        {info.emblem}
      </text>
      <text
        x="55"
        y="98"
        textAnchor="middle"
        fontSize={gold ? 40 : 48}
        fontWeight="900"
        fill={info.ink}
        stroke="rgba(0,0,0,0.35)"
        strokeWidth="1.5"
        paintOrder="stroke"
        style={{ fontFamily: "inherit" }}
      >
        {value}
      </text>
      <rect x="7" y="7" width="26" height="20" rx="4" fill="rgba(0,0,0,0.5)" />
      <text
        x="20"
        y="22"
        textAnchor="middle"
        fontSize="14"
        fontWeight="800"
        fill="#fff"
      >
        {value}
      </text>
      <text
        x="55"
        y="140"
        textAnchor="middle"
        fontSize="11"
        fontWeight="700"
        fill="#3a3a3a"
        letterSpacing="2"
      >
        {cardLabel(card).split(" ")[0].toUpperCase()}
      </text>
    </svg>
  );
}

/** An empty space in a hold. */
export function EmptySlot({ width = 34 }: { width?: number }) {
  const height = Math.round(width * (150 / 110));
  return (
    <svg
      viewBox="0 0 110 150"
      width={width}
      height={height}
      aria-hidden="true"
      style={{ display: "block", flex: "0 0 auto" }}
    >
      <rect
        x="3"
        y="3"
        width="104"
        height="144"
        rx="10"
        fill="rgba(255,255,255,0.04)"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="3"
        strokeDasharray="8 6"
      />
    </svg>
  );
}
