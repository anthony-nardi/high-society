import { Badge, Box, Group, Text } from "@mantine/core";
import { TwixtGameState, TwixtPlayerState } from "../types";
import { useUserContext } from "../../../shared/context/useUserContext";
import displayName, { isBotName } from "../../../shared/utils/displayName";
import ThinkingDots from "../../../shared/components/ThinkingDots";
import { SIDE_COLOUR } from "../board";

export default function PlayerOverview({
  player,
  gameState,
}: {
  player: TwixtPlayerState;
  gameState: TwixtGameState;
}) {
  const { user } = useUserContext();
  const isActivePlayer = player.email === gameState.activePlayer;
  const isCurrentUser = !!user && player.email === user.email;
  const isBot = isBotName(player.email);
  const pegs = Object.values(gameState.pegs || {}).filter(
    (s) => s === player.side,
  ).length;

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
      {isActivePlayer && gameState.status === "IN_PROGRESS" && (
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
      <Group gap={6} wrap="nowrap" mt={4} style={{ minWidth: 0 }}>
        <span
          style={{
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: SIDE_COLOUR[player.side],
            border: "1px solid rgba(0,0,0,0.5)",
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
      <Text size="xs" c="dimmed" mt={2}>
        {player.side === "RED" ? "Red: top to bottom" : "Black: left to right"}{" "}
        · {pegs} peg
        {pegs === 1 ? "" : "s"}
      </Text>
    </Box>
  );
}
