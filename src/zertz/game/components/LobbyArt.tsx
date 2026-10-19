import { MarbleDefs, MarbleShape } from "./Marble";
import type { Colour } from "../types";

/** One marble, sitting in its ring on the shrinking board. */
export default function MarbleCard({ colour }: { colour: Colour }) {
  return (
    <svg viewBox="0 0 56 56" width="50" height="50" aria-hidden="true">
      <MarbleDefs />
      <circle
        cx="28"
        cy="28"
        r="24"
        fill="#2a2f3a"
        stroke="#9aa3b2"
        strokeWidth="3"
      />
      <MarbleShape colour={colour} x={28} y={28} r={15} />
    </svg>
  );
}
