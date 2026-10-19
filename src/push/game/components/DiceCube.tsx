import type { CSSProperties } from "react";
import type { DieFace } from "../types";
import { Die } from "./CardFace";
import classes from "../push.module.css";

/*
 * The die as a cube: six faces folded round a box, thrown with a tumble
 * of spins and bounces that ends with the rolled face to the front. The
 * other five faces are the rest of the die, so every spin shows real faces
 * flashing past.
 */
const ORDER: DieFace[] = ["RED", "BLUE", "YELLOW", "GREEN", "PURPLE", "STAR"];

const SIDES: CSSProperties[] = [
  { transform: "rotateY(0deg) translateZ(var(--half))" },
  { transform: "rotateY(180deg) translateZ(var(--half))" },
  { transform: "rotateY(90deg) translateZ(var(--half))" },
  { transform: "rotateY(-90deg) translateZ(var(--half))" },
  { transform: "rotateX(90deg) translateZ(var(--half))" },
  { transform: "rotateX(-90deg) translateZ(var(--half))" },
];

export default function DiceCube({
  face,
  size = 84,
}: {
  face: DieFace;
  size?: number;
}) {
  const others = ORDER.filter((f) => f !== face);
  const faces = [face, ...others];
  return (
    <div
      className={classes.throw}
      style={
        { "--size": `${size}px`, "--half": `${size / 2}px` } as CSSProperties
      }
      aria-hidden="true"
    >
      <div className={classes.shadow} />
      <div className={classes.cube}>
        {faces.map((f, i) => (
          <div key={f} className={classes.face} style={SIDES[i]}>
            <Die face={f} size={size} />
          </div>
        ))}
      </div>
    </div>
  );
}
