import { Badge, Box, Group, Text } from "@mantine/core";
import { GipfGameState, GipfPlayerState, Side } from "../types";
import { useUserContext } from "../../../shared/context/useUserContext";
import displayName, { isBotName } from "../../../shared/utils/displayName";
import ThinkingDots from "../../../shared/components/ThinkingDots";
import { piecesOf } from "../board";

export function PieceIcon({ side, size = 18 }: { side: Side; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <circle cx="11" cy="11.5" r="8" fill="#000" opacity="0.4" />
      <circle
        cx="10"
        cy="10"
        r="8"
        fill={side === "WHITE" ? "#f1f1f1" : "#1a1a1a"}
        stroke={side === "WHITE" ? "#8a8a8a" : "#000"}
      />
    </svg>
  );
}

export default function PlayerOverview({
  player,
  gameState,
}: {
  player: GipfPlayerState;
  gameState: GipfGameState;
}) {
  const { user } = useUserContext();
  const isActivePlayer = player.email === gameState.activePlayer;
  const isCurrentUser = !!user && player.email === user.email;
  const isBot = isBotName(player.email);
  const onBoard = piecesOf(gameState, player.side);

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
      <Group
        justify="space-between"
        align="flex-start"
        wrap="wrap"
        gap="xs"
        mt={4}
      >
        <div style={{ minWidth: 0 }}>
          <Group gap={6} align="center" wrap="nowrap">
            <PieceIcon side={player.side} />
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
          <Text size="xs" c="dimmed">
            {onBoard} on the board · {player.captured} captured
          </Text>
        </div>
        <Group
          gap={4}
          align="baseline"
          wrap="nowrap"
          aria-label={`${player.reserve} pieces in reserve`}
        >
          <Text
            size="xl"
            fw={800}
            lh={1}
            c={player.reserve <= 2 ? "red.5" : undefined}
          >
            {player.reserve}
          </Text>
          <Text size="xs" c="dimmed">
            in reserve
          </Text>
        </Group>
      </Group>
    </Box>
  );
}
