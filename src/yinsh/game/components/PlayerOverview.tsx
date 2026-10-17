import { Badge, Box, Group, Text } from "@mantine/core";
import { YinshGameState, YinshPlayerState } from "../types";
import { useUserContext } from "../../../shared/context/useUserContext";
import displayName, { isBotName } from "../../../shared/utils/displayName";
import { RINGS_TO_WIN, ringsOf } from "../board";

function RingIcon({
  side,
  hollow = false,
}: {
  side: "WHITE" | "BLACK";
  hollow?: boolean;
}) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <circle
        cx="11"
        cy="11"
        r="8"
        fill="none"
        stroke={side === "WHITE" ? "#f1f1f1" : "#1a1a1a"}
        strokeWidth="5"
        opacity={hollow ? 0.25 : 1}
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
  const onBoard = ringsOf(gameState, player.side).length;
  const markers = Object.values(gameState.markers || {}).filter(
    (s) => s === player.side,
  ).length;

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
        boxShadow: isActivePlayer
          ? "0 0 14px rgba(255, 216, 107, 0.45)"
          : undefined,
        background: isActivePlayer
          ? "rgba(255, 216, 107, 0.06)"
          : "var(--mantine-color-default)",
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
          {isCurrentUser
            ? "Your turn"
            : isBotName(player.email)
              ? "Bot thinking…"
              : "Their turn"}
        </Badge>
      )}
      <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
        <div>
          <Group gap="xs" align="center">
            <RingIcon side={player.side} />
            <Text fw={700}>
              {displayName(player.email)}
              {isCurrentUser && (
                <Text component="span" c="dimmed" fw={400}>
                  {" "}
                  (you)
                </Text>
              )}
            </Text>
          </Group>
          <Text size="sm" c="dimmed">
            {player.side.toLowerCase()} · {onBoard} ring
            {onBoard === 1 ? "" : "s"} on the board · {markers} marker
            {markers === 1 ? "" : "s"}
          </Text>
        </div>
        <Group
          gap={4}
          align="center"
          aria-label={`${player.scored} of ${RINGS_TO_WIN} rings scored`}
        >
          <Text size="sm" c="dimmed" mr={4}>
            Scored
          </Text>
          {Array.from({ length: RINGS_TO_WIN }, (_, i) => (
            <RingIcon key={i} side={player.side} hollow={i >= player.scored} />
          ))}
        </Group>
      </Group>
    </Box>
  );
}
