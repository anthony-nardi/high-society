import type { CSSProperties } from "react";
import formatMoney from "../money";

/**
 * A Money token drawn as a banded stack of bills, printed in thousands.
 * "available" means it can still be bid this round; a won token is face
 * down until the next round.
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
  width?: number | string;
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

  const bill = available ? "#2e8b57" : "#3a4a3f";
  const billDark = available ? "#1b5634" : "#26312a";
  const band = available ? "#f6edd0" : "#9a9a8a";
  const value = formatMoney(amount);

  const art = (
    <svg
      viewBox="0 0 120 84"
      width="100%"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      {/* Two bills underneath, then the top bill with its band. */}
      <rect x="10" y="22" width="104" height="52" rx="6" fill={billDark} />
      <rect
        x="6"
        y="14"
        width="104"
        height="52"
        rx="6"
        fill={billDark}
        stroke="#0f2e1c"
        strokeWidth="1.5"
      />
      <rect
        x="2"
        y="6"
        width="104"
        height="52"
        rx="6"
        fill={bill}
        stroke="#0f2e1c"
        strokeWidth="2"
      />
      <rect x="2" y="20" width="104" height="24" fill={band} opacity="0.95" />
      <text
        x="54"
        y="37"
        textAnchor="middle"
        fontSize={value.length > 6 ? 15 : 17}
        fontWeight="700"
        fill="#1c1f24"
        fontFamily="Georgia, 'Times New Roman', serif"
      >
        {value}
      </text>
    </svg>
  );

  const label = `Money token ${value}${available ? "" : " (spent or won this round)"}`;

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
