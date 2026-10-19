import { Text } from "@mantine/core";
import { CondottiereGameState } from "../types";
import displayName from "../../../shared/utils/displayName";
import { REGIONS } from "../board";
import classes from "../condottiere.module.css";

/**
 * The white flag: when a Surrender ends a battle, this fills the screen
 * for a few seconds so nobody misses what happened, then fades away.
 */
export default function SurrenderMoment({
  gameState,
  me,
}: {
  gameState: CondottiereGameState;
  me?: string;
}) {
  const move = gameState.lastMove;
  const last = gameState.lastBattle;
  if (
    !move ||
    move.type !== "play" ||
    move.card !== "SURRENDER" ||
    gameState.phase !== "CHOOSE" ||
    !last
  )
    return null;
  const who = move.email === me ? "You" : displayName(move.email);
  const winner = last.winner
    ? last.winner === me
      ? "You"
      : displayName(last.winner)
    : null;
  const top = Math.max(0, ...last.totals.map((t) => t.strength));
  return (
    <div
      key={gameState.notification?.timestamp ?? 0}
      className={classes.surrender}
      role="status"
      aria-live="assertive"
      data-testid="surrender-moment"
    >
      <div className={classes.surrenderCard}>
        <span className={classes.flag} aria-hidden="true">
          🏳
        </span>
        <div className={classes.surrenderTitle}>SURRENDER</div>
        <Text size="lg" fw={700}>
          {who} {move.email === me ? "end" : "ends"} the battle for{" "}
          {REGIONS[last.region].name}.
        </Text>
        <Text size="md" c="yellow.4" fw={700}>
          {winner
            ? `${winner} ${winner === "You" ? "take" : "takes"} it with ${top}.`
            : top > 0
              ? `A draw at ${top}: nobody takes it.`
              : "Nobody takes it."}
        </Text>
      </div>
    </div>
  );
}
