import { CSSProperties } from "react";
import { money } from "../money";

/** A cheque card, in thousands. A worthless one is marked as such. */
export default function ChequeCard({
  amount,
  width = 110,
  style,
  className,
}: {
  amount: number;
  width?: number;
  style?: CSSProperties;
  className?: string;
}) {
  const height = Math.round(width * (150 / 110));
  const worthless = amount === 0;
  return (
    <svg
      viewBox="0 0 110 150"
      width={width}
      height={height}
      role="img"
      aria-label={`Cheque for ${money(amount)}`}
      className={className}
      style={{
        display: "block",
        flex: "0 0 auto",
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
        fill={worthless ? "#e6e0d2" : "#dfeedd"}
        stroke="#3a3a3a"
        strokeWidth="2"
      />
      <rect
        x="8"
        y="8"
        width="94"
        height="134"
        rx="6"
        fill="none"
        stroke={worthless ? "#9a948a" : "#4f8a5a"}
        strokeWidth="1.5"
        strokeDasharray="4 3"
      />
      <text x="14" y="26" fontSize="8" fill="#555" letterSpacing="1">
        PAY TO THE BEARER
      </text>
      <line x1="14" y1="40" x2="96" y2="40" stroke="#888" strokeWidth="1" />
      <text
        x="55"
        y="84"
        textAnchor="middle"
        fontSize={amount >= 10 ? 20 : 22}
        fontWeight="800"
        fill={worthless ? "#8a8070" : "#2f5e3a"}
      >
        {money(amount)}
      </text>
      {worthless && (
        <text
          x="55"
          y="104"
          textAnchor="middle"
          fontSize="9"
          fontWeight="700"
          fill="#b03a2e"
          letterSpacing="1"
        >
          WORTHLESS
        </text>
      )}
      <line x1="14" y1="122" x2="70" y2="122" stroke="#888" strokeWidth="1" />
      <path
        d="M18 120 q8 -10 16 0 t16 0"
        fill="none"
        stroke="#2f5e3a"
        strokeWidth="1.5"
      />
      <text x="96" y="136" textAnchor="end" fontSize="7" fill="#777">
        For Sale Bank
      </text>
    </svg>
  );
}
