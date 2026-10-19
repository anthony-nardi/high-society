import { CHAIN_COLOUR, TIER, label } from "../board";
import type { Chain } from "../types";

/** A stock certificate for one hotel chain: its colour, its name and a skyline sized to its tier. */
export default function ChainCard({ chain }: { chain: Chain }) {
  const colour = CHAIN_COLOUR[chain];
  const tier = TIER[chain];
  const towers = [
    { x: 8, h: 14 + tier * 6 },
    { x: 19, h: 24 + tier * 8 },
    { x: 30, h: 18 + tier * 7 },
    { x: 41, h: 12 + tier * 5 },
  ];
  return (
    <svg viewBox="0 0 56 78" width="46" height="64" aria-hidden="true">
      <rect
        x="1"
        y="1"
        width="54"
        height="76"
        rx="5"
        fill="#f3ead8"
        stroke="#1d2230"
        strokeWidth="2"
      />
      <rect x="4" y="4" width="48" height="14" rx="3" fill={colour} />
      <text
        x="28"
        y="14.5"
        textAnchor="middle"
        fontSize="8.5"
        fontWeight="900"
        fill="#fff"
        letterSpacing="0.5"
      >
        {label(chain).toUpperCase()}
      </text>
      <rect x="4" y="22" width="48" height="40" rx="2" fill="#1d2230" />
      {towers.map((t, i) => (
        <g key={i}>
          <rect
            x={t.x}
            y={60 - t.h}
            width="8"
            height={t.h}
            fill={colour}
            opacity={0.85}
          />
          {Array.from({ length: Math.floor(t.h / 6) }, (_, w) => (
            <rect
              key={w}
              x={t.x + 2}
              y={58 - w * 6}
              width="4"
              height="2"
              fill="#fff6c8"
              opacity={0.75}
            />
          ))}
        </g>
      ))}
      <text
        x="28"
        y="72"
        textAnchor="middle"
        fontSize="7"
        fontWeight="700"
        fill="#1d2230"
        letterSpacing="1"
      >
        1 SHARE
      </text>
    </svg>
  );
}
