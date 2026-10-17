import { Badge, Box, Group, Text } from "@mantine/core";
import { YinshGameState, YinshPlayerState } from "../types";
import { useUserContext } from "../../../shared/context/useUserContext";
import displayName, { isBotName } from "../../../shared/utils/displayName";
import ThinkingDots from "../../../shared/components/ThinkingDots";
import { RINGS_TO_WIN, ringsOf } from "../board";

function RingIcon({
  side,
  hollow = false,
  size = 22,
}: {
  side: "WHITE" | "BLACK";
  hollow?: boolean;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 22 22"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      {!hollow && (
        <circle
          cx="12"
          cy="12.5"
          r="8"
          fill="none"
          stroke="#000"
          strokeWidth="5"
          opacity="0.35"
        />
      )}
      <circle
        cx="11"
        cy="11"
        r="8"
        fill="none"
        stroke={side === "WHITE" ? "#f1f1f1" : "#1a1a1a"}
        strokeWidth="5"
        opacity={hollow ? 0.2 : 1}
        strokeDasharray={hollow ? "3 2" : undefined}
      />
      <circle
        cx="11"
        cy="11"
        r="8"
        fill="none"
        stroke="#777"
        strokeWidth="1"
        opacity="0.6"
      />
    </svg>
  );
}

export default function PlayerOverview({
  player,
  gameState,
}: {
  player: YinshPlayerState;
  gameState: YinshGameState;
}) {
  const { user } = useUserContext();
  const isActivePlayer = player.email === gameState.activePlayer;
  const isCurrentUser = !!user && player.email === user.email;
  const isBot = isBotName(player.email);
  const onBoard = ringsOf(gameState, player.side).length;
  const markers = Object.values(gameState.markers || {}).filter(
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
            <RingIcon side={player.side} size={20} />
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
          <Text size="xs" c="dimmed" visibleFrom="md">
            {player.side.toLowerCase()} · {onBoard} ring
            {onBoard === 1 ? "" : "s"} on the board · {markers} marker
            {markers === 1 ? "" : "s"}
          </Text>
          <Text size="xs" c="dimmed" hiddenFrom="md">
            {onBoard} on board
          </Text>
        </div>
        {/* Three slots that fill as rings are won. */}
        <Group
          gap={3}
          align="center"
          wrap="nowrap"
          aria-label={`${player.scored} of ${RINGS_TO_WIN} rings scored`}
        >
          {Array.from({ length: RINGS_TO_WIN }, (_, i) => (
            <RingIcon
              key={i}
              side={player.side}
              hollow={i >= player.scored}
              size={24}
            />
          ))}
        </Group>
      </Group>
    </Box>
  );
}
