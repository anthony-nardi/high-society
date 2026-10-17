import { Badge, Button, Group, Loader, Stack, Text } from "@mantine/core";
import { Colour, COLOURS, Coord, ZertzGameState } from "../types";
import displayName, { isBotName } from "../../../shared/utils/displayName";
import ThinkingDots from "../../../shared/components/ThinkingDots";
import Marble from "./Marble";
import { capturers, count, placeableColours } from "../board";
import classes from "./ActionPanel.module.css";

/**
 * Fixed strip along the bottom. The board itself takes the clicks; this
 * explains the phase, offers the colour to place, and cancels a selection.
 */
export default function ActionPanel({
  gameState,
  isActive,
  selectedColour,
  selectedMarble,
  loading,
  onSelectColour,
  onCancel,
}: {
  gameState: ZertzGameState;
  isActive: boolean;
  selectedColour: Colour | null;
  selectedMarble: Coord | null;
  loading: boolean;
  onSelectColour: (colour: Colour) => void;
  onCancel: () => void;
}) {
  const phase = gameState.phase;
  const mustCapture = phase === "MOVE" && capturers(gameState).length > 0;
  const placing = phase === "MOVE" && !mustCapture;
  const colours = placeableColours(gameState);
  const poolEmpty = COLOURS.every((c) => count(gameState.pool, c) === 0);

  if (!isActive) {
    const who = displayName(gameState.activePlayer);
    const doing =
      phase === "REMOVE_RING"
        ? "is removing a ring"
        : phase === "CONTINUE_CAPTURE"
          ? "is mid-capture"
          : mustCapture
            ? "must capture"
            : "is placing a marble";
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
  } else if (phase === "CONTINUE_CAPTURE") {
    hint = `Your marble on ${gameState.capturingAt} can jump again, and must. Tap a highlighted ring.`;
  } else if (mustCapture) {
    hint = selectedMarble
      ? `Tap a highlighted ring to jump to, or anywhere else to put it back.`
      : `A capture is available, so you must take it. Tap one of the glowing marbles.`;
  } else if (phase === "REMOVE_RING") {
    hint = "Now remove a ring: tap one of the dashed red rings on the edge.";
  } else {
    hint = poolEmpty
      ? "The pool is empty, so you place one of your captured marbles. Tap a vacant ring."
      : "Pick a colour, then tap a vacant ring to place it. Then you remove a free ring.";
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
          {placing &&
            colours.map((colour) => (
              <Button
                key={colour}
                variant={selectedColour === colour ? "filled" : "default"}
                color={selectedColour === colour ? "yellow" : undefined}
                leftSection={<Marble colour={colour} size={18} />}
                disabled={loading}
                onClick={() => onSelectColour(colour)}
                aria-pressed={selectedColour === colour}
              >
                {colour.toLowerCase()}
                <Text component="span" c="dimmed" ml={6}>
                  {count(gameState.pool, colour)}
                </Text>
              </Button>
            ))}
          {selectedMarble && phase !== "CONTINUE_CAPTURE" && (
            <Button variant="default" disabled={loading} onClick={onCancel}>
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
