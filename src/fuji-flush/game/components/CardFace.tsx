import { CSSProperties } from "react";
import { Band, bandOf } from "../board";

/*
 * A Fuji Flush card: its number over a mountain that climbs with it. Low
 * numbers are meadows under a summer sky; the twenty is a night summit.
 */

const SKY: { [band in Band]: [string, string] } = {
  0: ["#8fcf9a", "#e3f5d6"],
  1: ["#6fb3d6", "#d9edf8"],
  2: ["#4f78c2", "#b9cff0"],
  3: ["#22254d", "#5a4f9a"],
};
const SLOPE: { [band in Band]: string } = {
  0: "#5f9452",
  1: "#4a7c8c",
  2: "#39568c",
  3: "#262b4d",
};
const GROUND: { [band in Band]: string } = {
  0: "#7fae5a",
  1: "#5f8f6c",
  2: "#4e6b8f",
  3: "#2d2f52",
};

export default function CardFace({
  card,
  width = 110,
  selected = false,
  dimmed = false,
  decorative = false,
  style,
  className,
}: {
  card: number;
  width?: number;
  selected?: boolean;
  dimmed?: boolean;
  /** Inside a labelled button: no name of its own. */
  decorative?: boolean;
  style?: CSSProperties;
  className?: string;
}) {
  const band = bandOf(card);
  const [skyTop, skyBottom] = SKY[band];
  const height = Math.round(width * (150 / 110));
  const climb = (card - 2) / 18;
  const peakY = 118 - Math.round(36 + climb * 62);
  const capH = Math.round(9 + climb * 20);
  const capW = Math.round((capH * 50) / (121 - peakY));

  return (
    <svg
      viewBox="0 0 110 150"
      width={width}
      height={height}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : `Card ${card}`}
      className={className}
      style={{
        display: "block",
        flex: "0 0 auto",
        opacity: dimmed ? 0.45 : 1,
        transition: "transform 120ms, opacity 150ms",
        transform: selected ? "translateY(-8px)" : undefined,
        filter: selected
          ? "drop-shadow(0 0 8px rgba(255, 216, 107, 0.8))"
          : "drop-shadow(0 3px 4px rgba(0,0,0,0.45))",
        ...style,
      }}
    >
      <defs>
        <linearGradient id={`fuji-sky-${band}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={skyTop} />
          <stop offset="100%" stopColor={skyBottom} />
        </linearGradient>
      </defs>
      <rect
        x="1"
        y="1"
        width="108"
        height="148"
        rx="10"
        fill="#f6f1e6"
        stroke={selected ? "#ffd86b" : "#3a3a3a"}
        strokeWidth={selected ? 4 : 2}
      />
      <rect
        x="7"
        y="7"
        width="96"
        height="114"
        rx="6"
        fill={`url(#fuji-sky-${band})`}
      />
      {band === 3 ? (
        <>
          <circle cx="86" cy="22" r="7" fill="#f3f0d8" />
          <circle cx="83" cy="20" r="6" fill="#4a4390" />
          <circle cx="20" cy="18" r="1.4" fill="#fff" />
          <circle cx="34" cy="30" r="1" fill="#fff" />
          <circle cx="70" cy="14" r="1.2" fill="#fff" />
          <circle cx="96" cy="44" r="1" fill="#fff" />
        </>
      ) : (
        <circle cx="86" cy="24" r="8" fill="#ffd86b" opacity="0.9" />
      )}
      <path
        d={`M 4 121 L 55 ${peakY} L 106 121 Z`}
        fill={SLOPE[band]}
        stroke="rgba(0,0,0,0.25)"
        strokeWidth="1"
      />
      <path
        d={`M 55 ${peakY} L ${55 - capW} ${peakY + capH} L ${55 - capW / 2} ${peakY + capH - 4} L 55 ${peakY + capH + 3} L ${55 + capW / 2} ${peakY + capH - 4} L ${55 + capW} ${peakY + capH} Z`}
        fill="#ffffff"
        opacity="0.92"
      />
      <rect x="7" y="104" width="96" height="17" fill={GROUND[band]} />
      <text
        x="55"
        y="94"
        textAnchor="middle"
        fontSize="40"
        fontWeight="900"
        fill="#fff"
        stroke="#1b1f3b"
        strokeWidth="1.8"
        paintOrder="stroke"
        style={{ fontFamily: "inherit" }}
      >
        {card}
      </text>
      <rect x="7" y="7" width="30" height="22" rx="4" fill="rgba(0,0,0,0.55)" />
      <text
        x="22"
        y="23"
        textAnchor="middle"
        fontSize="15"
        fontWeight="800"
        fill="#fff"
      >
        {card}
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
        FUJI
      </text>
    </svg>
  );
}

/** The back of a card, for counting hands. */
export function CardBack({
  width = 20,
  style,
}: {
  width?: number;
  style?: CSSProperties;
}) {
  const height = Math.round(width * (150 / 110));
  return (
    <svg
      viewBox="0 0 110 150"
      width={width}
      height={height}
      aria-hidden="true"
      style={{ display: "block", flex: "0 0 auto", ...style }}
    >
      <rect
        x="1"
        y="1"
        width="108"
        height="148"
        rx="10"
        fill="#2b3a67"
        stroke="#0f131a"
        strokeWidth="3"
      />
      <path
        d="M 14 118 L 55 36 L 96 118 Z"
        fill="none"
        stroke="#f6f1e6"
        strokeWidth="6"
      />
      <path d="M 40 66 L 55 36 L 70 66 Z" fill="#f6f1e6" />
    </svg>
  );
}
