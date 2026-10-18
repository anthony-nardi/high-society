import { Badge, Box, Group, Text } from "@mantine/core";
import { ClansGameState, ClansPlayerState } from "../types";
import { useUserContext } from "../../../shared/context/useUserContext";
import displayName, { isBotName } from "../../../shared/utils/displayName";
import ThinkingDots from "../../../shared/components/ThinkingDots";
import { COLOUR_HEX, label } from "../board";

export default function PlayerOverview({
  player,
  gameState,
}: {
  player: ClansPlayerState;
  gameState: ClansGameState;
}) {
  const { user } = useUserContext();
  const isActivePlayer = player.email === gameState.activePlayer;
  const isCurrentUser = !!user && player.email === user.email;
  const isBot = isBotName(player.email);
  const over = gameState.status === "GAME_OVER";
  // The clan is secret until the end: only you see your own.
  const showClan = isCurrentUser || over;

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
      {isActivePlayer && !over && (
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
      <Group
        justify="space-between"
        align="center"
        wrap="nowrap"
        gap="xs"
        mt={4}
      >
        <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
          <span
            title={showClan ? `${label(player.colour)} clan` : "Clan unknown"}
            style={{
              width: 14,
              height: 14,
              borderRadius: 4,
              background: showClan ? COLOUR_HEX[player.colour] : "transparent",
              border: showClan
                ? "1px solid rgba(0,0,0,0.5)"
                : "1px dashed var(--mantine-color-dimmed)",
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
        <Text size="xs" c="dimmed" style={{ whiteSpace: "nowrap" }}>
          {player.chips} chip{player.chips === 1 ? "" : "s"}
        </Text>
      </Group>
      <Text size="xs" c="dimmed" mt={2}>
        {showClan
          ? `${label(player.colour)} clan: ${gameState.scores[player.colour]} on the track`
          : "Clan secret until the end"}
      </Text>
    </Box>
  );
}
