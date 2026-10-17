import { Badge, Box, Group, Text } from "@mantine/core";
import { ShangriLaGameState, ShangriLaPlayerState } from "../types";
import { useUserContext } from "../../../shared/context/useUserContext";
import displayName, { isBotName } from "../../../shared/utils/displayName";
import ThinkingDots from "../../../shared/components/ThinkingDots";
import { COLOUR_FILL, scoreOf } from "../board";

export default function PlayerOverview({
  player,
  gameState,
}: {
  player: ShangriLaPlayerState;
  gameState: ShangriLaGameState;
}) {
  const { user } = useUserContext();
  const isActivePlayer = player.email === gameState.activePlayer;
  const isCurrentUser = !!user && player.email === user.email;
  const isBot = isBotName(player.email);
  const score = scoreOf(gameState, player.email);
  const supply = Object.values(player.supply).reduce((s, n) => s + n, 0);

  return (
    <Box
      p="sm"
      data-testid="player-overview"
      style={{
        position: "relative",
        borderRadius: 12,
        border: isActivePlayer
          ? "2px solid var(--mantine-color-yellow-5)"
          : "2px solid transparent",
        boxShadow: isActivePlayer
          ? "0 0 14px rgba(255, 216, 107, 0.45)"
          : undefined,
        background: isActivePlayer
          ? "rgba(255, 216, 107, 0.06)"
          : "var(--mantine-color-default)",
        transition: "border-color 200ms, box-shadow 200ms",
        minWidth: 0,
      }}
    >
      {isActivePlayer && (
        <Badge
          color="yellow"
          variant="filled"
          radius="sm"
          style={{ position: "absolute", top: -10, left: 12 }}
        >
          {isCurrentUser ? (
            "Your turn"
          ) : isBot ? (
            <>
              Thinking
              <ThinkingDots />
            </>
          ) : (
            "Their turn"
          )}
        </Badge>
      )}
      <Group justify="space-between" align="center" wrap="wrap" gap="xs" mt={4}>
        <Group gap={6} align="center" wrap="nowrap" style={{ minWidth: 0 }}>
          <span
            aria-label={`${player.colour.toLowerCase()} clan`}
            style={{
              width: 14,
              height: 14,
              borderRadius: 4,
              background: COLOUR_FILL[player.colour],
              border: "1px solid #222",
              flex: "0 0 auto",
            }}
          />
          <Text fw={700} truncate>
            {displayName(player.email)}
            {isCurrentUser && (
              <Text component="span" c="dimmed" fw={400}>
                {" "}
                (you)
              </Text>
            )}
          </Text>
        </Group>
        <Group
          gap={4}
          align="baseline"
          wrap="nowrap"
          aria-label={`${score.masters} masters in ${score.villages} villages`}
        >
          <Text size="xl" fw={800} lh={1}>
            {score.masters}
          </Text>
          <Text size="xs" c="dimmed">
            masters · {score.villages} village{score.villages === 1 ? "" : "s"}
          </Text>
        </Group>
      </Group>
      <Text size="xs" c="dimmed" mt={2}>
        {score.students} student{score.students === 1 ? "" : "s"} on the road ·{" "}
        {supply} tiles in supply
      </Text>
    </Box>
  );
}
