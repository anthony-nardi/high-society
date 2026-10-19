/** A YINSH ring with a marker inside it, or a bare ring. */
export default function RingCard({
  ring,
  marker,
}: {
  ring: "white" | "black";
  marker?: "white" | "black";
}) {
  const rc = ring === "white" ? "#f1efe6" : "#23262e";
  const mc = marker === "white" ? "#f1efe6" : "#23262e";
  return (
    <svg viewBox="0 0 56 56" width="50" height="50" aria-hidden="true">
      <circle cx="28" cy="28" r="25" fill="#5a4632" />
      <line x1="4" y1="28" x2="52" y2="28" stroke="#3b2d20" strokeWidth="1.5" />
      <line x1="16" y1="7" x2="40" y2="49" stroke="#3b2d20" strokeWidth="1.5" />
      <line x1="40" y1="7" x2="16" y2="49" stroke="#3b2d20" strokeWidth="1.5" />
      {marker && (
        <circle
          cx="28"
          cy="28"
          r="9"
          fill={mc}
          stroke="rgba(0,0,0,0.5)"
          strokeWidth="1"
        />
      )}
      <circle cx="28" cy="28" r="16" fill="none" stroke={rc} strokeWidth="6" />
      <circle
        cx="28"
        cy="28"
        r="16"
        fill="none"
        stroke="rgba(0,0,0,0.35)"
        strokeWidth="1"
      />
    </svg>
  );
}
