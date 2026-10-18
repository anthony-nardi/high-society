import { Colour } from "../types";
import { COLOUR_HEX } from "../board";

/** The symbol on a tile, drawn in a 40 by 40 box: ziggurat, furrows, urn, house. */
export function TileSymbol({ colour }: { colour: Colour }) {
  const ink = "rgba(255,255,255,0.92)";
  switch (colour) {
    case "RED":
      return (
        <path
          d="M 8 31 h 24 v -5 h -4 v -5 h -4 v -5 h -3 v -6 h -2 v 6 h -3 v 5 h -4 v 5 h -4 z"
          fill={ink}
        />
      );
    case "BLUE":
      return (
        <g fill="none" stroke={ink} strokeWidth="2.6" strokeLinecap="round">
          <path d="M 8 14 q 4 -4 8 0 t 8 0 t 8 0" />
          <path d="M 8 21 q 4 -4 8 0 t 8 0 t 8 0" />
          <path d="M 8 28 q 4 -4 8 0 t 8 0 t 8 0" />
        </g>
      );
    case "GREEN":
      return (
        <path
          d="M 14 8 h 12 v 4 h -2 c 7 5 7 15 0 19 h -8 c -7 -4 -7 -14 0 -19 h -2 z"
          fill={ink}
        />
      );
    default:
      return (
        <path
          d="M 9 19 l 11 -9 l 11 9 v 12 h -22 z M 17 24 h 6 v 7 h -6 z"
          fill={ink}
          fillRule="evenodd"
        />
      );
  }
}

/** A tile face for the hand and the rules: a coloured square with its symbol. */
export default function TileIcon({
  colour,
  size = 40,
  down = false,
}: {
  colour: Colour;
  size?: number;
  down?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      role="img"
      aria-label={`${colour.toLowerCase()} tile`}
      style={{ display: "block", flex: "0 0 auto" }}
    >
      <rect
        x="1.5"
        y="1.5"
        width="37"
        height="37"
        rx="6"
        fill={down ? "#2a2622" : COLOUR_HEX[colour]}
        stroke="rgba(0,0,0,0.55)"
        strokeWidth="1.5"
      />
      {!down && <TileSymbol colour={colour} />}
    </svg>
  );
}
