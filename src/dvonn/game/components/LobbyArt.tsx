/** A DVONN stack seen from the side: pieces piled up, perhaps capped with a red dvonn piece. */
export default function StackCard({
  pieces,
}: {
  /** Bottom to top: w white, b black, d dvonn. */
  pieces: string;
}) {
  const colour = (ch: string) =>
    ch === "w" ? "#efe9d8" : ch === "b" ? "#23262e" : "#d13b2f";
  const h = 8;
  return (
    <svg viewBox="0 0 56 72" width="44" height="56" aria-hidden="true">
      <ellipse cx="28" cy="62" rx="22" ry="6" fill="rgba(0,0,0,0.35)" />
      {[...pieces].map((ch, i) => (
        <g key={i}>
          <rect
            x="8"
            y={58 - i * h - h}
            width="40"
            height={h}
            fill={colour(ch)}
            stroke="rgba(0,0,0,0.45)"
            strokeWidth="1"
          />
          <ellipse
            cx="28"
            cy={58 - i * h - h}
            rx="20"
            ry="4"
            fill={colour(ch)}
            stroke="rgba(0,0,0,0.45)"
            strokeWidth="1"
          />
        </g>
      ))}
    </svg>
  );
}
