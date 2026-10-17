import { CSSProperties } from "react";
import { Tier, tierOf } from "../money";

/** Sky and ground per grade: dusk for the cheap end, night with stars for the towers. */
const SKY: { [tier in Tier]: [string, string] } = {
  1: ["#c9a06b", "#e5c89a"],
  2: ["#b5894f", "#e8c07a"],
  3: ["#7fb0d9", "#d7ecff"],
  4: ["#5f93c9", "#bcd9f5"],
  5: ["#4c5f9e", "#9fb0e3"],
  6: ["#1b1f3b", "#3b3f7a"],
};
const GROUND: { [tier in Tier]: string } = {
  1: "#8a7148",
  2: "#7a8b4a",
  3: "#5f9b4f",
  4: "#4f8f4a",
  5: "#3f7f55",
  6: "#2c3650",
};

function House({ tier }: { tier: Tier }) {
  switch (tier) {
    case 1:
      return (
        <g>
          <rect
            x="30"
            y="86"
            width="50"
            height="34"
            fill="#c89b62"
            stroke="#7a5a2e"
            strokeWidth="2"
          />
          <path
            d="M30 86 L42 72 L92 72 L80 86 Z"
            fill="#dcb47a"
            stroke="#7a5a2e"
            strokeWidth="2"
          />
          <path
            d="M80 86 L92 72 L92 106 L80 120 Z"
            fill="#b48a52"
            stroke="#7a5a2e"
            strokeWidth="2"
          />
          <line
            x1="55"
            y1="86"
            x2="55"
            y2="120"
            stroke="#7a5a2e"
            strokeWidth="1.5"
            strokeDasharray="3 2"
          />
        </g>
      );
    case 2:
      return (
        <g>
          <rect
            x="28"
            y="84"
            width="54"
            height="36"
            fill="#9c7a4d"
            stroke="#5a4328"
            strokeWidth="2"
          />
          <path
            d="M22 86 L55 62 L88 86 Z"
            fill="#6f5436"
            stroke="#5a4328"
            strokeWidth="2"
          />
          <rect x="48" y="98" width="14" height="22" fill="#4a3620" />
          <rect
            x="33"
            y="92"
            width="10"
            height="9"
            fill="#d7e6ee"
            stroke="#5a4328"
          />
          <rect
            x="66"
            y="100"
            width="12"
            height="8"
            fill="#8a6a3f"
            stroke="#5a4328"
          />
        </g>
      );
    case 3:
      return (
        <g>
          <rect
            x="26"
            y="82"
            width="58"
            height="38"
            fill="#f1e2c6"
            stroke="#6b4e2e"
            strokeWidth="2"
          />
          <path
            d="M20 84 L55 56 L90 84 Z"
            fill="#b8482f"
            stroke="#6b4e2e"
            strokeWidth="2"
          />
          <rect x="68" y="60" width="8" height="16" fill="#8b5a3c" />
          <rect x="48" y="98" width="14" height="22" fill="#6b4e2e" />
          <rect
            x="32"
            y="92"
            width="11"
            height="11"
            fill="#9fd3ea"
            stroke="#6b4e2e"
          />
          <rect
            x="67"
            y="92"
            width="11"
            height="11"
            fill="#9fd3ea"
            stroke="#6b4e2e"
          />
          <circle cx="97" cy="96" r="10" fill="#3f8f45" />
          <rect x="95" y="104" width="4" height="16" fill="#6b4e2e" />
        </g>
      );
    case 4:
      return (
        <g>
          <rect
            x="24"
            y="66"
            width="62"
            height="54"
            fill="#e9dcc8"
            stroke="#4e3b2a"
            strokeWidth="2"
          />
          <path
            d="M20 68 L55 44 L90 68 Z"
            fill="#5a6b8a"
            stroke="#4e3b2a"
            strokeWidth="2"
          />
          {[32, 50, 68].map((x) => (
            <rect
              key={x}
              x={x}
              y="74"
              width="10"
              height="11"
              fill="#a9d8ee"
              stroke="#4e3b2a"
            />
          ))}
          {[32, 68].map((x) => (
            <rect
              key={x}
              x={x}
              y="96"
              width="10"
              height="11"
              fill="#a9d8ee"
              stroke="#4e3b2a"
            />
          ))}
          <rect x="49" y="96" width="12" height="24" fill="#4e3b2a" />
          <rect x="18" y="118" width="74" height="3" fill="#4e3b2a" />
        </g>
      );
    case 5:
      return (
        <g>
          <rect
            x="14"
            y="70"
            width="82"
            height="50"
            fill="#f4efe4"
            stroke="#3f3a52"
            strokeWidth="2"
          />
          <path
            d="M10 72 L55 48 L100 72 Z"
            fill="#8c3b3b"
            stroke="#3f3a52"
            strokeWidth="2"
          />
          {[22, 38, 64, 80].map((x) => (
            <rect
              key={x}
              x={x}
              y="78"
              width="8"
              height="42"
              fill="#e0d6c2"
              stroke="#3f3a52"
            />
          ))}
          <rect x="48" y="92" width="14" height="28" fill="#3f3a52" />
          <rect x="30" y="80" width="6" height="8" fill="#9fd3ea" />
          <rect x="74" y="80" width="6" height="8" fill="#9fd3ea" />
          <path d="M4 120 H106" stroke="#3f3a52" strokeWidth="3" />
        </g>
      );
    default:
      return (
        <g>
          <rect
            x="34"
            y="30"
            width="42"
            height="90"
            fill="#5d6b8f"
            stroke="#1b1f3b"
            strokeWidth="2"
          />
          <rect
            x="20"
            y="70"
            width="18"
            height="50"
            fill="#46527a"
            stroke="#1b1f3b"
            strokeWidth="2"
          />
          <rect
            x="72"
            y="60"
            width="18"
            height="60"
            fill="#46527a"
            stroke="#1b1f3b"
            strokeWidth="2"
          />
          {Array.from({ length: 6 }, (_, r) =>
            [40, 50, 60].map((x) => (
              <rect
                key={`${r}-${x}`}
                x={x}
                y={36 + r * 13}
                width="6"
                height="7"
                fill={(r + x) % 2 ? "#ffe9a3" : "#9fb6ff"}
              />
            )),
          )}
          <path d="M55 30 L55 16" stroke="#ffd86b" strokeWidth="2" />
          <circle cx="55" cy="14" r="2.5" fill="#ffd86b" />
          <circle cx="22" cy="24" r="1.5" fill="#fff" />
          <circle cx="92" cy="40" r="1.2" fill="#fff" />
          <circle cx="84" cy="18" r="1.8" fill="#fff" />
        </g>
      );
  }
}

/** A property card: its number and a house that grows with it. */
export default function PropertyCard({
  property,
  width = 110,
  selected = false,
  dimmed = false,
  onClick,
  style,
  className,
}: {
  property: number;
  width?: number;
  selected?: boolean;
  dimmed?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
  className?: string;
}) {
  const tier = tierOf(property);
  const [skyTop, skyBottom] = SKY[tier];
  const height = Math.round(width * (150 / 110));
  return (
    <svg
      viewBox="0 0 110 150"
      width={width}
      height={height}
      role={onClick ? "button" : "img"}
      aria-label={`Property ${property}${selected ? " (selected)" : ""}`}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) onClick();
      }}
      className={className}
      style={{
        display: "block",
        flex: "0 0 auto",
        cursor: onClick ? "pointer" : "default",
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
        <linearGradient id={`sky-${tier}`} x1="0" y1="0" x2="0" y2="1">
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
        fill={`url(#sky-${tier})`}
      />
      <rect x="7" y="104" width="96" height="17" fill={GROUND[tier]} />
      <House tier={tier} />
      <rect x="7" y="7" width="30" height="22" rx="4" fill="rgba(0,0,0,0.55)" />
      <text
        x="22"
        y="23"
        textAnchor="middle"
        fontSize="15"
        fontWeight="800"
        fill="#fff"
      >
        {property}
      </text>
      <text
        x="55"
        y="140"
        textAnchor="middle"
        fontSize="12"
        fontWeight="700"
        fill="#3a3a3a"
        letterSpacing="1"
      >
        No. {property}
      </text>
    </svg>
  );
}
