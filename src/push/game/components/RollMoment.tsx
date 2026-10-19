import { Text } from "@mantine/core";
import type { PushGameState } from "../types";
import { cardLabel, colourName, columnLabel, nameFor, points } from "../board";
import CardFace from "./CardFace";
import DiceCube from "./DiceCube";
import classes from "../push.module.css";

/**
 * A die roll: the die is thrown across the table, spinning and bouncing,
 * and settles with its face to the front; the verdict is read out once it
 * has landed, and the cards it takes shake and fall. It shows for a few
 * seconds, then fades, so nobody misses what the die did.
 */
export default function RollMoment({
  gameState,
  me,
}: {
  gameState: PushGameState;
  me?: string | null;
}) {
  const roll = gameState.lastRoll;
  if (!roll || roll.turn !== gameState.turn) return null;
  // Only while the roll is the latest thing that happened.
  const title = gameState.notification?.title || "";
  if (!/The die shows|pushes too far/.test(title)) return null;
  const who = nameFor(roll.email, me);
  const lost = roll.lost || [];
  return (
    <div
      key={gameState.notification?.timestamp ?? 0}
      className={classes.roll}
      role="status"
      aria-live="assertive"
      data-testid="roll-moment"
    >
      <div className={classes.rollCard}>
        <div className={classes.rollTitle}>
          {roll.reason === "BUST" ? "TOO FAR" : "ROLL"}
        </div>
        {roll.reason === "BUST" && roll.card && (
          <Text size="sm" c="dimmed">
            {cardLabel(roll.card)} fits nowhere.
          </Text>
        )}
        <DiceCube face={roll.face} size={84} />
        <Text size="lg" fw={700} ta="center" className={classes.verdict}>
          {roll.face === "STAR"
            ? `The star: ${who} ${who === "you" ? "lose" : "loses"} nothing.`
            : lost.length
              ? `${colourName(roll.face)}: ${who} ${who === "you" ? "lose" : "loses"} ${points(lost)} points.`
              : `${colourName(roll.face)}: ${who} ${who === "you" ? "have" : "has"} none to lose.`}
        </Text>
        {lost.length > 0 && (
          <div
            style={{ display: "flex", gap: 4 }}
            aria-label={columnLabel(lost)}
          >
            {lost.map((c, i) => (
              <div key={i} className={classes.lost}>
                <CardFace card={c} width={40} decorative />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
