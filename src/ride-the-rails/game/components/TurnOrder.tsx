import { RideTheRailsGameState } from "../types";
import displayName from "../../../shared/utils/displayName";
import { hasActed } from "../board";
import classes from "../rails.module.css";

/** Who plays in what order this phase: shares run backwards, the rest forwards. */
export default function TurnOrder({
  gameState,
}: {
  gameState: RideTheRailsGameState;
}) {
  const reverse = gameState.phase === "SHARE";
  const seats = reverse ? [...gameState.order].reverse() : gameState.order;
  return (
    <div
      className={classes.order}
      role="list"
      aria-label={`Turn order${reverse ? ", reversed for shares" : ""}`}
    >
      {seats.map((email, i) => {
        const active = email === gameState.activePlayer;
        const done = hasActed(gameState, email);
        return (
          <span key={email} style={{ display: "contents" }}>
            {i > 0 && (
              <span className={classes.arrow} aria-hidden="true">
                →
              </span>
            )}
            <span
              role="listitem"
              className={`${classes.seat} ${active ? classes.seatActive : ""} ${done ? classes.seatDone : ""}`}
              aria-current={active ? "true" : undefined}
              aria-label={`${displayName(email)}${active ? ", acting now" : done ? ", done" : ", waiting"}`}
            >
              <span style={{ opacity: 0.6 }}>
                {gameState.order.indexOf(email) + 1}
              </span>
              {displayName(email)}
            </span>
          </span>
        );
      })}
    </div>
  );
}
