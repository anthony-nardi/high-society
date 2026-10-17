import { Badge, Button, Group, Loader, Stack, Text } from "@mantine/core";
import { Colour, Coord, LyngkGameState } from "../types";
import displayName, { isBotName } from "../../../shared/utils/displayName";
import ThinkingDots from "../../../shared/components/ThinkingDots";
import { PieceIcon } from "./PlayerOverview";
import classes from "./ActionPanel.module.css";

/** Fixed strip: claim buttons and the hint for the current step. The board takes the taps. */
export default function ActionPanel({
  gameState,
  isActive,
  path,
  claimable,
  loading,
  onClaim,
  onCancel,
}: {
  gameState: LyngkGameState;
  isActive: boolean;
  path: Coord[];
  claimable: Colour[];
  loading: boolean;
  onClaim: (colour: Colour) => void;
  onCancel: () => void;
}) {
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
              Waiting for {who} to move.
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
  } else if (path.length > 1) {
    hint =
      "Tap a gold spot to land, or a teal spot to carry on through your own colour. Tap elsewhere to start over.";
  } else if (path.length === 1) {
    hint =
      "Tap a gold spot to land there. Teal spots are LYNGK links: your colour, to pass through.";
  } else {
    hint = claimable.length
      ? "Claim a colour first if you like, then tap a glowing piece or stack to move it."
      : "Tap a glowing piece or stack to move it. It slides to the first piece it meets.";
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
          {!loading &&
            path.length === 0 &&
            claimable.map((colour) => (
              <Button
                key={colour}
                size="xs"
                variant="default"
                leftSection={<PieceIcon piece={colour} size={14} />}
                onClick={() => onClaim(colour)}
              >
                Claim {colour.toLowerCase()}
              </Button>
            ))}
          {path.length > 0 && !loading && (
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
