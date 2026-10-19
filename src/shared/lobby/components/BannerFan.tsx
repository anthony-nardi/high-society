import type { CSSProperties, ReactNode } from "react";
import classes from "../lobby.module.css";

/**
 * A row of card faces fanned along a gentle arc, dealt in one after the
 * other. Any card face will do; the theme supplies them.
 */
export default function BannerFan({ cards }: { cards: ReactNode[] }) {
  const n = cards.length;
  const centre = (n - 1) / 2;
  return (
    <div className={classes.banner} aria-hidden="true">
      {cards.map((card, i) => {
        const offset = n > 1 ? (i - centre) / centre : 0;
        return (
          <div
            key={i}
            className={classes.bannerCard}
            style={
              {
                "--tilt": `${offset * 16}deg`,
                "--lift": `${Math.abs(offset) * 14}px`,
                "--delay": `${i * 55}ms`,
                zIndex: i,
              } as CSSProperties
            }
          >
            {card}
          </div>
        );
      })}
    </div>
  );
}
