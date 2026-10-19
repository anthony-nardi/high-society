import { CSSProperties } from "react";
import {
  cardLabel,
  COLOUR_INFO,
  colourOf,
  isDice,
  isSwitch,
  valueOf,
} from "../board";
import type { Card, Colour } from "../types";

/*
 * A PUSH card: the number large on its colour, with the colour's shape
 * in the corners as the rulebook does for the colour-blind. The dice card
 * is black with a die; the switch card shows two arrows.
 */
export default function CardFace({
  card,
  width = 64,
  down = false,
  dimmed = false,
  decorative = false,
  style,
  className,
}: {
  card: Card;
  width?: number;
  /** Face down: a protected card. */
  down?: boolean;
  dimmed?: boolean;
  /** Inside a labelled element: no name of its own. */
  decorative?: boolean;
  style?: CSSProperties;
  className?: string;
}) {
  const height = Math.round(width * (90 / 64));
  const colour = colourOf(card);
  const info = colour ? COLOUR_INFO[colour as Colour] : null;
  const label = down ? "Protected card" : cardLabel(card);

  return (
    <svg
      viewBox="0 0 64 90"
      width={width}
      height={height}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : label}
      className={className}
      style={{
        display: "block",
        flex: "0 0 auto",
        opacity: dimmed ? 0.45 : 1,
        transition: "opacity 150ms",
        filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.45))",
        ...style,
      }}
    >
      {down ? (
        <>
          <rect
            x="1"
            y="1"
            width="62"
            height="88"
            rx="7"
            fill="#2b2f3a"
            stroke="#0f131a"
            strokeWidth="2"
          />
          <rect
            x="8"
            y="8"
            width="48"
            height="74"
            rx="4"
            fill="none"
            stroke="#8c94a6"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
          <text x="32" y="51" textAnchor="middle" fontSize="18" fill="#8c94a6">
            🔒
          </text>
        </>
      ) : isDice(card) ? (
        <>
          <rect
            x="1"
            y="1"
            width="62"
            height="88"
            rx="7"
            fill="#17181c"
            stroke="#000"
            strokeWidth="2"
          />
          <rect
            x="17"
            y="30"
            width="30"
            height="30"
            rx="6"
            fill="#f3ead8"
            stroke="#000"
            strokeWidth="1.5"
          />
          {[
            [24, 37],
            [40, 37],
            [32, 45],
            [24, 53],
            [40, 53],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="2.6" fill="#17181c" />
          ))}
          <text
            x="32"
            y="76"
            textAnchor="middle"
            fontSize="9"
            fontWeight="800"
            fill="#f3ead8"
            letterSpacing="1.5"
          >
            ROLL
          </text>
        </>
      ) : isSwitch(card) ? (
        <>
          <rect
            x="1"
            y="1"
            width="62"
            height="88"
            rx="7"
            fill="#f3ead8"
            stroke="#3a3a3a"
            strokeWidth="2"
          />
          <path
            d="M 14 36 h 28 l -7 -7 m 7 7 l -7 7"
            fill="none"
            stroke="#3a3a3a"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M 50 54 h -28 l 7 -7 m -7 7 l 7 7"
            fill="none"
            stroke="#3a3a3a"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <text
            x="32"
            y="78"
            textAnchor="middle"
            fontSize="9"
            fontWeight="800"
            fill="#3a3a3a"
            letterSpacing="1.5"
          >
            SWITCH
          </text>
        </>
      ) : (
        <>
          <rect
            x="1"
            y="1"
            width="62"
            height="88"
            rx="7"
            fill={info?.colour}
            stroke="rgba(0,0,0,0.55)"
            strokeWidth="2"
          />
          <rect
            x="6"
            y="6"
            width="52"
            height="78"
            rx="4"
            fill="none"
            stroke="rgba(255,255,255,0.35)"
            strokeWidth="1"
          />
          <text
            x="32"
            y="59"
            textAnchor="middle"
            fontSize="40"
            fontWeight="900"
            fill={info?.ink}
            style={{ fontFamily: "inherit" }}
          >
            {valueOf(card)}
          </text>
          <text x="11" y="18" fontSize="11" fill={info?.ink} opacity="0.9">
            {info?.shape}
          </text>
          <text
            x="53"
            y="82"
            textAnchor="end"
            fontSize="11"
            fill={info?.ink}
            opacity="0.9"
          >
            {info?.shape}
          </text>
        </>
      )}
    </svg>
  );
}

/** The die, showing a face: a coloured square with its shape, or the star. */
export function Die({ face, size = 56 }: { face: string; size?: number }) {
  const info = face === "STAR" ? null : COLOUR_INFO[face as Colour];
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label={`Die: ${face === "STAR" ? "star" : info?.name}`}
    >
      <rect
        x="4"
        y="4"
        width="56"
        height="56"
        rx="12"
        fill="#f3ead8"
        stroke="#1d2230"
        strokeWidth="3"
      />
      {info ? (
        <>
          <rect
            x="16"
            y="16"
            width="32"
            height="32"
            rx="6"
            fill={info.colour}
          />
          <text x="32" y="39" textAnchor="middle" fontSize="18" fill={info.ink}>
            {info.shape}
          </text>
        </>
      ) : (
        <text x="32" y="44" textAnchor="middle" fontSize="34" fill="#1d2230">
          ★
        </text>
      )}
    </svg>
  );
}
