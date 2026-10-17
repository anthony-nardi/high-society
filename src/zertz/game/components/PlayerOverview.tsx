import { Badge, Box, Group, Progress, Text } from "@mantine/core";
import { ZertzGameState, ZertzPlayerState, COLOURS } from "../types";
import { useUserContext } from "../../../shared/context/useUserContext";
import displayName, { isBotName } from "../../../shared/utils/displayName";
import Marble from "./Marble";
import { count, winHint, winProgress } from "../board";

export default function PlayerOverview({
  player,
  gameState,
}: {
  player: ZertzPlayerState;
  gameState: ZertzGameState;
}) {
  const { user } = useUserContext();
  const isActivePlayer = player.email === gameState.activePlayer;
  const isCurrentUser = !!user && player.email === user.email;
  const progress = winProgress(player.captured);
  const hint = winHint(player.captured);
  const total = COLOURS.reduce((sum, c) => sum + count(player.captured, c), 0);

  return (
    <Box
      p="md"
      data-testid="player-overview"
      style={{
        position: "relative",
        borderRadius: 12,
        border: isActivePlayer
          ? "2px solid var(--mantine-color-yellow-5)"
          : "2px solid transparent",
        boxShadow: isActivePlayer ? "0 0 14px rgba(255, 216, 107, 0.45)" : undefined,
        background: isActivePlayer ? "rgba(255, 216, 107, 0.06)" : "var(--mantine-color-default)",
        transition: "border-color 200ms, box-shadow 200ms",
      }}
    >
      {isActivePlayer && (
        <Badge
          color="yellow"
          variant="filled"
          radius="sm"
          style={{ position: "absolute", top: -10, left: 12 }}
        >
          {isCurrentUser ? "Your turn" : isBotName(player.email) ? "Bot thinking…" : "Their turn"}
        </Badge>
      )}

      <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
        <div>
          <Text fw={700}>
            {displayName(player.email)}
            {isCurrentUser && (
              <Text component="span" c="dimmed" fw={400}>
                {" "}
                (you)
              </Text>
            )}
          </Text>
          <Text size="sm" c="dimmed">
            {total} captured · {hint.label} to win
          </Text>
        </div>
        <Group gap="md" wrap="wrap" aria-label={`${displayName(player.email)}'s captured marbles`}>
          {COLOURS.map((colour) => (
            <Group key={colour} gap={4} wrap="nowrap">
              <Marble colour={colour} size={20} />
              <Text size="sm" fw={600}>
                {count(player.captured, colour)}
              </Text>
            </Group>
          ))}
        </Group>
      </Group>
      <Progress
        value={progress * 100}
        color={progress >= 0.75 ? "yellow" : "blue"}
        size="xs"
        mt="xs"
        aria-label="Progress towards a win"
      />
    </Box>
  );
}
