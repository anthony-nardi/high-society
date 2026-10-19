const COLOURS = ["#d13b2f", "#3b7dd8", "#e9c832", "#4f9a4a"];

/** A village of Shangri-La: a roof on stilts, with a master's colour and a bridge leading away. */
export default function VillageCard({
  seat,
  students = 0,
}: {
  seat: number;
  students?: number;
}) {
  const colour = COLOURS[seat % COLOURS.length];
  return (
    <svg viewBox="0 0 56 72" width="46" height="60" aria-hidden="true">
      <rect x="0" y="52" width="56" height="20" fill="#6b7f8d" opacity="0.6" />
      <path
        d="M 4 52 Q 28 36 52 52"
        fill="none"
        stroke="#9c7b4f"
        strokeWidth="3"
      />
      <rect
        x="12"
        y="30"
        width="32"
        height="18"
        fill="#c9a66b"
        stroke="#5a4328"
        strokeWidth="1.5"
      />
      <path
        d="M 6 32 L 28 14 L 50 32 Z"
        fill="#8c2f2f"
        stroke="#4a1818"
        strokeWidth="1.5"
      />
      <path
        d="M 10 32 L 28 20 L 46 32"
        fill="none"
        stroke="#e0a56b"
        strokeWidth="1"
      />
      <circle
        cx="28"
        cy="40"
        r="5"
        fill={colour}
        stroke="rgba(0,0,0,0.5)"
        strokeWidth="1"
      />
      {Array.from({ length: students }, (_, i) => (
        <circle
          key={i}
          cx={16 + i * 8}
          cy="58"
          r="3"
          fill={colour}
          stroke="rgba(0,0,0,0.5)"
          strokeWidth="1"
        />
      ))}
    </svg>
  );
}
