import type { CSSProperties } from "react";

/**
 * A money card. "available" means it can still be bid this round; a won
 * card is face down until the next round.
 */
export default function MoneyCard({
  amount,
  available = true,
  selected = false,
  onClick,
  disabled = false,
  width = 56,
}: {
  amount: string;
  available?: boolean;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  width?: number;
}) {
  const style: CSSProperties = {
    width,
    flex: "0 0 auto",
    padding: 0,
    border: 0,
    background: "none",
    borderRadius: 8,
    cursor: onClick && !disabled ? "pointer" : "default",
    opacity: available ? 1 : 0.4,
    outline: selected ? "3px solid var(--mantine-color-yellow-5)" : undefined,
    boxShadow: selected ? "0 0 12px rgba(255, 216, 107, 0.7)" : undefined,
    transform: selected ? "translateY(-6px)" : undefined,
    transition: "transform 150ms, box-shadow 150ms, opacity 150ms",
  };

  const art = (
    <svg
      viewBox="0 0 120 80"
      width="100%"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <rect
        x="2"
        y="2"
        width="116"
        height="76"
        rx="10"
        fill={available ? "#2F6B4F" : "#3a3f3a"}
        stroke="#D9B44A"
        strokeWidth="4"
      />
      <rect
        x="12"
        y="12"
        width="96"
        height="56"
        rx="6"
        fill={available ? "#3B7A5B" : "#4a504a"}
        stroke="#D9B44A"
        strokeWidth="2"
      />
      <text
        x="60"
        y="48"
        textAnchor="middle"
        fontSize="34"
        fontWeight="700"
        fill="#F3E6B0"
        fontFamily="Georgia, serif"
      >
        {amount}
      </text>
    </svg>
  );

  const label = `Money ${amount}${available ? "" : " (spent or won this round)"}`;

  if (onClick) {
    return (
      <button
        type="button"
        style={style}
        onClick={onClick}
        disabled={disabled}
        aria-pressed={selected}
        aria-label={label}
      >
        {art}
      </button>
    );
  }
  return (
    <div role="img" aria-label={label} style={style}>
      {art}
    </div>
  );
}
