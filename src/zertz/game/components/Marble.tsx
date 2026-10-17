import { Colour } from "../types";

const SHADES: { [colour in Colour]: [string, string] } = {
  WHITE: ["#ffffff", "#b9b9b9"],
  GRAY: ["#b0b0b0", "#4f4f4f"],
  BLACK: ["#5a5a5a", "#050505"],
};

/** Gradient definitions, included once per SVG that draws marbles. */
export function MarbleDefs() {
  return (
    <defs>
      {(Object.keys(SHADES) as Colour[]).map((colour) => (
        <radialGradient key={colour} id={`marble-${colour}`} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor={SHADES[colour][0]} />
          <stop offset="100%" stopColor={SHADES[colour][1]} />
        </radialGradient>
      ))}
    </defs>
  );
}

/** A marble centred at (x, y) inside an SVG that has MarbleDefs. */
export function MarbleShape({
  colour,
  x = 0,
  y = 0,
  r = 16,
  highlighted = false,
}: {
  colour: Colour;
  x?: number;
  y?: number;
  r?: number;
  highlighted?: boolean;
}) {
  return (
    <g>
      <circle cx={x + r * 0.12} cy={y + r * 0.18} r={r} fill="#000" opacity="0.4" />
      <circle
        cx={x}
        cy={y}
        r={r}
        fill={`url(#marble-${colour})`}
        stroke={highlighted ? "#ffd86b" : "#1b1b1b"}
        strokeWidth={highlighted ? 3 : 1}
      />
    </g>
  );
}

/** A standalone marble icon for counts and legends. */
export default function Marble({
  colour,
  size = 22,
}: {
  colour: Colour;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      aria-label={`${colour.toLowerCase()} marble`}
      role="img"
      style={{ display: "block" }}
    >
      <MarbleDefs />
      <MarbleShape colour={colour} x={20} y={20} r={17} />
    </svg>
  );
}
