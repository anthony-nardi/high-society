import { Badge, Box, Group, Text } from "@mantine/core";
import { CondottiereGameState, CondottierePlayerState } from "../types";
import { useUserContext } from "../../../shared/context/useUserContext";
import displayName, { isBotName } from "../../../shared/utils/displayName";
import ThinkingDots from "../../../shared/components/ThinkingDots";
import { colourOf, largestConnected, REGIONS } from "../board";

export default function PlayerOverview({
  player,
  gameState,
}: {
  player: CondottierePlayerState;
  gameState: CondottiereGameState;
}) {
  const { user } = useUserContext();
  const isActivePlayer = player.email === gameState.activePlayer;
  const isCurrentUser = !!user && player.email === user.email;
  const isBot = isBotName(player.email);
  const regions = player.regions || [];
  const chain = largestConnected(regions);

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
        <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 3,
              background: colourOf(gameState, player.email),
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
          {gameState.condottiere === player.email && (
            <Badge size="xs" color="yellow" variant="light" radius="sm">
              Condottiere
            </Badge>
          )}
        </Group>
        <Text size="xs" c="dimmed">
          {(player.hand || []).length} card
          {(player.hand || []).length === 1 ? "" : "s"}
        </Text>
      </Group>
      <Text
        size="xs"
        c="dimmed"
        mt={2}
        aria-label={`${regions.length} regions, ${chain} adjacent`}
      >
        {regions.length === 0
          ? "No regions yet"
          : `${regions.map((r) => REGIONS[r].name).join(", ")} · ${chain} adjacent`}
      </Text>
    </Box>
  );
}
