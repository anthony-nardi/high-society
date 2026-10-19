/** A GIPF piece on its hex board: a single piece, or a doubled GIPF piece. */
export default function PieceCard({
  colour,
  gipf = false,
}: {
  colour: "white" | "black";
  gipf?: boolean;
}) {
  const fill = colour === "white" ? "#efe9d8" : "#23262e";
  const ink = colour === "white" ? "#8a8370" : "#555b66";
  return (
    <svg viewBox="0 0 56 56" width="50" height="50" aria-hidden="true">
      <polygon
        points="28,3 50,15.5 50,40.5 28,53 6,40.5 6,15.5"
        fill="#2f3542"
        stroke="#7b8494"
        strokeWidth="2"
      />
      <line x1="6" y1="28" x2="50" y2="28" stroke="#4a5262" strokeWidth="1" />
      <line x1="17" y1="9" x2="39" y2="47" stroke="#4a5262" strokeWidth="1" />
      <line x1="39" y1="9" x2="17" y2="47" stroke="#4a5262" strokeWidth="1" />
      {gipf && (
        <circle
          cx="28"
          cy="25"
          r="13"
          fill={fill}
          stroke="rgba(0,0,0,0.5)"
          strokeWidth="1.5"
        />
      )}
      <circle
        cx="28"
        cy={gipf ? 30 : 28}
        r="13"
        fill={fill}
        stroke="rgba(0,0,0,0.5)"
        strokeWidth="1.5"
      />
      <circle
        cx="28"
        cy={gipf ? 30 : 28}
        r="5"
        fill="none"
        stroke={ink}
        strokeWidth="1.5"
      />
    </svg>
  );
}
