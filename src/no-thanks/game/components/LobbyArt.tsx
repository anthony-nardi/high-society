/** A No Thanks! card: a big number on cream, with a few chips sitting on it. */
export default function NumberCard({
  value,
  chips = 0,
}: {
  value: number;
  chips?: number;
}) {
  return (
    <svg viewBox="0 0 56 78" width="46" height="64" aria-hidden="true">
      <rect
        x="1"
        y="1"
        width="54"
        height="76"
        rx="6"
        fill="#f6efe0"
        stroke="#8c1d2c"
        strokeWidth="2.5"
      />
      <rect
        x="6"
        y="6"
        width="44"
        height="66"
        rx="4"
        fill="none"
        stroke="#8c1d2c"
        strokeWidth="1"
        opacity="0.5"
      />
      <text
        x="28"
        y="46"
        textAnchor="middle"
        fontSize="30"
        fontWeight="900"
        fill="#8c1d2c"
      >
        {value}
      </text>
      {Array.from({ length: chips }, (_, i) => (
        <circle
          key={i}
          cx={14 + i * 10}
          cy="64"
          r="5"
          fill="#d93a3a"
          stroke="#5a0f16"
          strokeWidth="1.5"
        />
      ))}
    </svg>
  );
}
