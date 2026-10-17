import { Badge, Button, Group, Loader, Stack, Text } from "@mantine/core";
import { Coord, DvonnGameState } from "../types";
import displayName, { isBotName } from "../../../shared/utils/displayName";
import ThinkingDots from "../../../shared/components/ThinkingDots";
import { stackAt } from "../board";
import classes from "./ActionPanel.module.css";

/** Fixed strip explaining the phase; the board takes the taps. */
export default function ActionPanel({
  gameState,
  isActive,
  selected,
  loading,
  onCancel,
}: {
  gameState: DvonnGameState;
  isActive: boolean;
  selected: Coord | null;
  loading: boolean;
  onCancel: () => void;
}) {
  const phase = gameState.phase;
  const who = displayName(gameState.activePlayer);
  const me = gameState.players.find((p) => p.email === gameState.activePlayer);

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
              {phase === "PLACE" ? "placing a piece" : "moving a stack"}.
              {isBotName(gameState.activePlayer) && <ThinkingDots />}
            </>
          )}
        </Text>
      </div>
    );
  }

  let hint: string;
  if (loading) {
    hint = "Sending your move…";
  } else if (phase === "PLACE") {
    hint =
      me && me.dvonn > 0
        ? "Place a red DVONN piece on any empty space. Everything must stay linked to one of these."
        : `Place one of your pieces on any empty space (${me?.pieces ?? 0} left).`;
  } else if (selected) {
    const height = stackAt(gameState, selected)?.length ?? 1;
    hint = `Tap a highlighted space to land there. A stack of ${height} moves exactly ${height} space${height === 1 ? "" : "s"}. Tap elsewhere to put it back.`;
  } else {
    hint =
      "Tap one of your glowing stacks. A stack moves as many spaces as it is tall, in a straight line, onto other pieces.";
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
          {selected && !loading && (
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
