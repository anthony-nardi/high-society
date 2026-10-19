/** A patch of the TwixT board: pegs of one colour joined by a knight's-move link. */
export default function LinkCard({
  colour,
  linked = true,
}: {
  colour: "red" | "black";
  linked?: boolean;
}) {
  const fill = colour === "red" ? "#d13b2f" : "#23262e";
  const holes: [number, number][] = [];
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++) holes.push([8 + c * 13.3, 8 + r * 13.3]);
  return (
    <svg viewBox="0 0 56 56" width="50" height="50" aria-hidden="true">
      <rect x="0" y="0" width="56" height="56" rx="6" fill="#c9b48a" />
      {holes.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.6" fill="#7a6648" />
      ))}
      {linked && (
        <line
          x1={8 + 0 * 13.3}
          y1={8 + 3 * 13.3}
          x2={8 + 2 * 13.3}
          y2={8 + 2 * 13.3}
          stroke={fill}
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      )}
      <circle
        cx={8}
        cy={8 + 3 * 13.3}
        r="5"
        fill={fill}
        stroke="rgba(0,0,0,0.5)"
        strokeWidth="1"
      />
      <circle
        cx={8 + 2 * 13.3}
        cy={8 + 2 * 13.3}
        r="5"
        fill={fill}
        stroke="rgba(0,0,0,0.5)"
        strokeWidth="1"
      />
    </svg>
  );
}
