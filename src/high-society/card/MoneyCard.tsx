/** A money card from the player's hand. Scales with its container width. */
export default function MoneyCard({ value }: { value: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 300"
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <rect width="100%" height="100%" rx="15" ry="15" fill="#2F6B4F" />
      <rect
        x="8"
        y="8"
        width="184"
        height="284"
        rx="10"
        ry="10"
        fill="none"
        stroke="#D9B44A"
        strokeWidth="6"
      />
      <rect
        x="22"
        y="22"
        width="156"
        height="256"
        rx="6"
        ry="6"
        fill="#3B7A5B"
        stroke="#B4A166"
        strokeWidth="2"
        strokeDasharray="4 4"
      />
      <text
        x="100"
        y="150"
        fontSize="84"
        fontWeight="700"
        fill="#F3E4B0"
        textAnchor="middle"
        dominantBaseline="central"
      >
        {value}
      </text>
      <text x="32" y="48" fontSize="26" fill="#D9B44A">
        {value}
      </text>
      <text x="168" y="266" fontSize="26" fill="#D9B44A" textAnchor="end">
        {value}
      </text>
      <text
        x="100"
        y="222"
        fontSize="16"
        fill="#D9B44A"
        textAnchor="middle"
        letterSpacing="4"
      >
        MONEY
      </text>
    </svg>
  );
}
