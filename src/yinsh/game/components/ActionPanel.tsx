import { Badge, Button, Group, Loader, Stack, Text } from "@mantine/core";
import { Coord, YinshGameState } from "../types";
import displayName, { isBotName } from "../../../shared/utils/displayName";
import ThinkingDots from "../../../shared/components/ThinkingDots";
import classes from "./ActionPanel.module.css";

/** Fixed strip explaining the phase; the board takes the taps. */
export default function ActionPanel({
  gameState,
  isActive,
  selected,
  rowStart,
  loading,
  onCancel,
}: {
  gameState: YinshGameState;
  isActive: boolean;
  selected: Coord | null;
  rowStart: Coord | null;
  loading: boolean;
  onCancel: () => void;
}) {
  const phase = gameState.phase;
  const who = displayName(gameState.activePlayer);

  if (!isActive) {
    const doing =
      phase === "PLACE_RINGS"
        ? "is placing a ring"
        : phase === "REMOVE_ROW"
          ? "is taking a row off"
          : phase === "REMOVE_RING"
            ? "is removing a ring"
            : "is moving a ring";
    return (
      <div
        className={`${classes.panel} ${classes.compact} safe-bottom`}
        data-testid="action-panel"
      >
        <Text size="sm" c="dimmed" ta="center">
          {loading ? (
            <>
              Sending your move
              <ThinkingDots />
            </>
          ) : (
            <>
              Waiting for {who}, who {doing}.
              {isBotName(gameState.activePlayer) && <ThinkingDots />}{" "}
              {gameState.pool} markers left in the pool.
            </>
          )}
        </Text>
      </div>
    );
  }

  let hint: string;
  if (loading) {
    hint = "Sending your move…";
  } else if (phase === "PLACE_RINGS") {
    const placed = Object.keys(gameState.rings || {}).length;
    hint = `Place a ring on any vacant point (${placed} of 10 placed). Near the middle more lines run through it.`;
  } else if (phase === "REMOVE_ROW") {
    hint = rowStart
      ? "Now tap the marker at the other end of the five you want to take."
      : "You made a row! Tap a glowing marker to choose the five to remove; then you take a ring off.";
  } else if (phase === "REMOVE_RING") {
    hint =
      "Choose one of your rings to remove from the board. Three removed rings wins.";
  } else if (selected) {
    hint =
      "Tap a highlighted point to move there, or anywhere else to put the ring back.";
  } else {
    hint = `Tap one of your rings to move it. ${gameState.pool} markers left in the pool.`;
  }

  return (
    <div
      className={`${classes.panel} ${classes.active} safe-bottom`}
      data-testid="action-panel"
    >
      <Stack gap={6} align="center">
        <Group gap="sm" justify="center" wrap="wrap">
          <Badge color="yellow" variant="filled" radius="sm" size="lg">
            Your turn
          </Badge>
          {loading && (
            <Loader size="xs" color="yellow" aria-label="Sending your move" />
          )}
          {(selected || rowStart) && !loading && (
            <Button variant="default" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </Group>
        <Text size="sm" c="dimmed" ta="center">
          {hint}
        </Text>
      </Stack>
    </div>
  );
}
