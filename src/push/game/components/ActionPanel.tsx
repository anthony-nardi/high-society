import { Badge, Button, Group, Loader, Stack, Text } from "@mantine/core";
import ThinkingDots from "../../../shared/components/ThinkingDots";
import displayName, { isBotName } from "../../../shared/utils/displayName";
import type { Colour, PushGameState, PushPlayerState } from "../types";
import {
  COLOUR_INFO,
  columnLabel,
  groupByColour,
  isDice,
  points,
} from "../board";
import classes from "./ActionPanel.module.css";

/** Fixed strip: draw, stop or protect on your turn; a prompt to choose on the others'. */
export default function ActionPanel({
  gameState,
  player,
  loading,
  onDraw,
  onBank,
}: {
  gameState: PushGameState;
  player: PushPlayerState;
  loading: boolean;
  onDraw: () => void;
  onBank: (colour: Colour) => void;
}) {
  const active = player.email === gameState.activePlayer;
  const pusher = player.email === gameState.turnPlayer;
  const columns = gameState.columns || [];
  const pending = gameState.pending;
  const who = displayName(gameState.activePlayer);
  const groups = groupByColour(player.bench || []);

  if (!active) {
    return (
      <div
        className={`${classes.panel} ${classes.compact} safe-bottom`}
        data-testid="action-panel"
      >
        <Text size="sm" c="dimmed" ta="center">
          {gameState.phase === "CHOOSE"
            ? `Waiting for ${who} to choose a column`
            : `Waiting for ${who} to push`}
          {isBotName(gameState.activePlayer) && <ThinkingDots />}
        </Text>
      </div>
    );
  }

  if (gameState.phase === "CHOOSE") {
    return (
      <div
        className={`${classes.panel} ${classes.active} safe-bottom`}
        data-testid="action-panel"
      >
        <Stack gap={6} align="center">
          <Badge color="yellow" variant="filled" radius="sm" size="lg">
            Choose a column
          </Badge>
          <Text size="xs" c="dimmed" ta="center" data-testid="hint">
            Tap one of the columns above to take it into your zone. A column
            with a dice card makes you roll once its cards are in.
          </Text>
        </Stack>
      </div>
    );
  }

  if (pending) {
    return (
      <div
        className={`${classes.panel} ${classes.active} safe-bottom`}
        data-testid="action-panel"
      >
        <Stack gap={6} align="center">
          <Group gap="sm" justify="center" wrap="wrap">
            <Badge color="yellow" variant="filled" radius="sm" size="lg">
              Place {columnLabel([pending])}
            </Badge>
            {loading && <Loader size="xs" color="yellow" />}
          </Group>
          <Text size="xs" c="dimmed" ta="center" data-testid="hint">
            Tap a glowing column, or start a new one. Never two of a number or a
            colour together, and one dice card a column.
          </Text>
        </Stack>
      </div>
    );
  }

  const canDraw = gameState.deckCount > 0;
  const canBank = gameState.drawn === 0 && groups.length > 0;
  const best = columns.length ? Math.max(...columns.map((c) => points(c))) : 0;
  return (
    <div
      className={`${classes.panel} ${classes.active} safe-bottom`}
      data-testid="action-panel"
    >
      <Stack gap={6} align="center">
        <Group gap="sm" justify="center" wrap="wrap">
          <Badge color="yellow" variant="filled" radius="sm" size="lg">
            {pusher ? "Your turn" : "Your move"}
          </Badge>
          {loading && <Loader size="xs" color="yellow" />}
          <Button disabled={!canDraw || loading} onClick={onDraw}>
            {columns.length ? "Push: turn over another" : "Turn over a card"}
          </Button>
          {canBank &&
            groups.map((g) => (
              <Button
                key={g.colour}
                variant="light"
                disabled={loading}
                onClick={() => onBank(g.colour)}
                style={{
                  borderColor: COLOUR_INFO[g.colour].colour,
                }}
                leftSection={
                  <span
                    aria-hidden="true"
                    style={{
                      display: "inline-block",
                      width: 12,
                      height: 12,
                      borderRadius: 3,
                      background: COLOUR_INFO[g.colour].colour,
                    }}
                  />
                }
              >
                Protect {COLOUR_INFO[g.colour].name} ({points(g.cards)})
              </Button>
            ))}
        </Group>
        <Text size="xs" c="dimmed" ta="center" data-testid="hint">
          {columns.length
            ? `Tap a column to stop and take it (best is worth ${best}${columns.some((c) => c.some(isDice)) ? ", some carry a dice card" : ""}), or push on. A card that fits nowhere costs you the columns and a roll of the die.`
            : canBank
              ? "Turn over a card to start pushing, or give up the turn to protect one colour from the die for good."
              : canDraw
                ? "Turn over a card to start pushing."
                : "The deck is empty."}
        </Text>
      </Stack>
    </div>
  );
}
