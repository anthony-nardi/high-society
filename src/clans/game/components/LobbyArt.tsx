const COLOURS = ["#e9c832", "#4f9a4a", "#3b7dd8", "#d13b2f", "#23262e"];

/** A clan's hut, or a few of them gathered into a village. */
export default function HutCard({
  clan,
  huts = 1,
}: {
  clan: number;
  huts?: number;
}) {
  const colour = COLOURS[clan % COLOURS.length];
  const spots = [
    [28, 34],
    [14, 42],
    [42, 42],
  ].slice(0, huts);
  return (
    <svg viewBox="0 0 56 60" width="48" height="51" aria-hidden="true">
      <ellipse cx="28" cy="50" rx="26" ry="8" fill="#5f8a3a" opacity="0.7" />
      {spots.map(([x, y], i) => (
        <g key={i}>
          <rect
            x={x - 8}
            y={y - 2}
            width="16"
            height="12"
            fill={colour}
            stroke="rgba(0,0,0,0.5)"
            strokeWidth="1"
          />
          <path
            d={`M ${x - 11} ${y} L ${x} ${y - 11} L ${x + 11} ${y} Z`}
            fill="#8c6a4a"
            stroke="rgba(0,0,0,0.5)"
            strokeWidth="1"
          />
          <rect x={x - 2} y={y + 4} width="4" height="6" fill="#2a1d10" />
        </g>
      ))}
    </svg>
  );
}
