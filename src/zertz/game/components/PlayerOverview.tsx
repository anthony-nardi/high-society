import { Badge, Box, Group, Progress, Text } from "@mantine/core";
import { ZertzGameState, ZertzPlayerState, COLOURS } from "../types";
import { useUserContext } from "../../../shared/context/useUserContext";
import displayName, { isBotName } from "../../../shared/utils/displayName";
import ThinkingDots from "../../../shared/components/ThinkingDots";
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
  const isBot = isBotName(player.email);
  const progress = winProgress(player.captured);
  const hint = winHint(player.captured);
  const total = COLOURS.reduce((sum, c) => sum + count(player.captured, c), 0);

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

      <Text fw={700} truncate mt={4}>
        {displayName(player.email)}
        {isCurrentUser && (
          <Text component="span" c="dimmed" fw={400}>
            {" "}
            (you)
          </Text>
        )}
      </Text>
      <Text size="xs" c="dimmed">
        {total} captured · {hint.label} to win
      </Text>

      {/* The tray: every captured marble, drawn as a marble. */}
      <Group
        gap="sm"
        mt={6}
        wrap="wrap"
        aria-label={`${displayName(player.email)}'s captured marbles`}
      >
        {COLOURS.map((colour) => {
          const n = count(player.captured, colour);
          return (
            <Group
              key={colour}
              gap={2}
              wrap="nowrap"
              aria-label={`${n} ${colour.toLowerCase()}`}
            >
              {n === 0 ? (
                <Box style={{ opacity: 0.25 }}>
                  <Marble colour={colour} size={16} />
                </Box>
              ) : (
                Array.from({ length: n }, (_, i) => (
                  <Box key={i} style={{ marginLeft: i === 0 ? 0 : -5 }}>
                    <Marble colour={colour} size={16} />
                  </Box>
                ))
              )}
              <Text size="xs" fw={600} ml={2}>
                {n}
              </Text>
            </Group>
          );
        })}
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
