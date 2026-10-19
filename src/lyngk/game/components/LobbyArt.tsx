const COLOURS: { [key: string]: string } = {
  r: "#d13b2f",
  b: "#3b7dd8",
  g: "#4f9a4a",
  k: "#23262e",
  i: "#efe9d8",
  w: "#ffffff",
};

/** A LYNGK stack seen from the side, each piece in its own colour. */
export default function StackCard({
  pieces,
}: {
  /** Bottom to top: r red, b blue, g green, k black, i ivory, w white joker. */
  pieces: string;
}) {
  const h = 9;
  return (
    <svg viewBox="0 0 56 72" width="44" height="56" aria-hidden="true">
      <ellipse cx="28" cy="62" rx="22" ry="6" fill="rgba(0,0,0,0.35)" />
      {[...pieces].map((ch, i) => (
        <g key={i}>
          <rect
            x="9"
            y={58 - i * h - h}
            width="38"
            height={h}
            fill={COLOURS[ch] || "#888"}
            stroke="rgba(0,0,0,0.45)"
            strokeWidth="1"
          />
          <ellipse
            cx="28"
            cy={58 - i * h - h}
            rx="19"
            ry="4"
            fill={COLOURS[ch] || "#888"}
            stroke="rgba(0,0,0,0.45)"
            strokeWidth="1"
          />
        </g>
      ))}
    </svg>
  );
}
