import { Badge, Button, Group, Loader, Stack, Text } from "@mantine/core";
import { Link, TwixtGameState, TwixtPlayerState } from "../types";
import displayName, { isBotName } from "../../../shared/utils/displayName";
import ThinkingDots from "../../../shared/components/ThinkingDots";
import { label, swapAvailable } from "../board";
import classes from "./ActionPanel.module.css";

/** Fixed strip: the swap offer, a selected link to remove, and what to do. */
export default function ActionPanel({
  gameState,
  me,
  loading,
  selectedLink,
  onSwap,
  onRemoveLink,
  onCancel,
}: {
  gameState: TwixtGameState;
  me: TwixtPlayerState;
  loading: boolean;
  selectedLink: Link | null;
  onSwap: () => void;
  onRemoveLink: () => void;
  onCancel: () => void;
}) {
  const acting = gameState.activePlayer === me.email;
  const who = displayName(gameState.activePlayer);
  const swap = swapAvailable(gameState);

  if (!acting) {
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
              Waiting for {who}
              {swap ? " to swap or peg" : " to peg"}.
              {isBotName(gameState.activePlayer) && <ThinkingDots />}
            </>
          )}
        </Text>
      </div>
    );
  }

  return (
    <div
      className={`${classes.panel} ${classes.active} safe-bottom`}
      data-testid="action-panel"
    >
      <Stack gap={6} align="center">
        <Group gap="sm" justify="center" wrap="wrap">
          <Badge color="yellow" variant="filled" radius="sm" size="lg">
            Your turn · {me.side === "RED" ? "Red" : "Black"}
          </Badge>
          {loading && <Loader size="xs" color="yellow" />}
          {!loading && swap && (
            <Button size="xs" variant="light" onClick={onSwap}>
              Swap sides and take Red
            </Button>
          )}
          {!loading && selectedLink && (
            <>
              <Button
                size="xs"
                color="red"
                variant="light"
                onClick={onRemoveLink}
              >
                Remove link {label(selectedLink[0])}–{label(selectedLink[1])}
              </Button>
              <Button size="xs" variant="default" onClick={onCancel}>
                Keep it
              </Button>
            </>
          )}
        </Group>
        <Text size="sm" c="dimmed" ta="center">
          {loading
            ? "Sending your move…"
            : selectedLink
              ? "Removing a link frees the space for another; it does not end your turn."
              : swap
                ? "Red's first peg is down. Take Red yourself, or peg as Black. Tap a hole to peg."
                : `Tap a hole to peg. ${me.side === "RED" ? "Join the top to the bottom" : "Join the left to the right"}; links to your pegs a knight's move away are laid for you. Tap one of your links to remove it.`}
        </Text>
      </Stack>
    </div>
  );
}
