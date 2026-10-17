import { Badge, Button, Group, Loader, Stack, Text } from "@mantine/core";
import { Coord, GipfGameState } from "../types";
import displayName, { isBotName } from "../../../shared/utils/displayName";
import ThinkingDots from "../../../shared/components/ThinkingDots";
import classes from "./ActionPanel.module.css";

/** Fixed strip explaining the phase; the board takes the taps. */
export default function ActionPanel({
  gameState,
  isActive,
  selectedDot,
  loading,
  onCancel,
}: {
  gameState: GipfGameState;
  isActive: boolean;
  selectedDot: Coord | null;
  loading: boolean;
  onCancel: () => void;
}) {
  const phase = gameState.phase;
  const who = displayName(gameState.activePlayer);

  if (!isActive) {
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
              Waiting for {who}, who is{" "}
              {phase === "REMOVE_ROW"
                ? "choosing a row to take"
                : "pushing a piece in"}
              .{isBotName(gameState.activePlayer) && <ThinkingDots />}
            </>
          )}
        </Text>
      </div>
    );
  }

  let hint: string;
  if (loading) {
    hint = "Sending your move…";
  } else if (phase === "REMOVE_ROW") {
    hint =
      "Your rows cross. Tap a glowing piece that lies only in the row you want to take.";
  } else if (selectedDot) {
    hint =
      "Tap the highlighted spot to push in. Pieces in the way slide along one step. Tap elsewhere to change the dot.";
  } else {
    hint =
      "Tap a glowing dot around the edge to bring a piece in. Four of yours in a row come off, and anything touching them.";
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
          {selectedDot && !loading && (
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
