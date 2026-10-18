import { Badge, Box, Group, Text, Tooltip } from "@mantine/core";
import { TigrisGameState, TigrisPlayerState } from "../types";
import displayName, { isBotName } from "../../../shared/utils/displayName";
import ThinkingDots from "../../../shared/components/ThinkingDots";
import {
  COLOUR_HEX,
  COLOURS,
  DYNASTY_SYMBOL,
  DYNASTY_WORD,
  finalSpheres,
  label,
  LEADER_NAME,
  POINT_NAME,
} from "../board";

export default function PlayerOverview({
  player,
  gameState,
  me,
}: {
  player: TigrisPlayerState;
  gameState: TigrisGameState;
  me?: string | null;
}) {
  const isCurrentUser = player.email === me;
  const isBot = isBotName(player.email);
  const active = player.email === gameState.activePlayer;
  const turn = player.email === gameState.turnPlayer;
  const leaders = Object.entries(gameState.leaders || {}).filter(
    ([, l]) => l.email === player.email,
  );
  const lowest = finalSpheres(player.points, player.treasures)[0];
  const hand = (player.hand || []).length;

  return (
    <Box
      p="sm"
      data-testid="player-overview"
      style={{
        position: "relative",
        borderRadius: 12,
        border: active
          ? "2px solid var(--mantine-color-yellow-5)"
          : "2px solid transparent",
        boxShadow: active ? "0 0 14px rgba(255, 216, 107, 0.45)" : undefined,
        background: active
          ? "rgba(255, 216, 107, 0.06)"
          : "var(--mantine-color-default)",
        transition: "border-color 200ms, box-shadow 200ms",
        minWidth: 0,
      }}
    >
      {active && gameState.status === "IN_PROGRESS" && (
        <Badge
          color="yellow"
          variant="filled"
          radius="sm"
          style={{ position: "absolute", top: -10, left: 12 }}
        >
          {isCurrentUser ? (
            turn ? (
              "Your turn"
            ) : (
              "Your call"
            )
          ) : isBot ? (
            <>
              Thinking
              <ThinkingDots />
            </>
          ) : turn ? (
            "Their turn"
          ) : (
            "Deciding"
          )}
        </Badge>
      )}
      <Group justify="space-between" align="center" wrap="nowrap" gap={6}>
        <Text fw={700} truncate style={{ minWidth: 0 }}>
          <span aria-label={`${DYNASTY_WORD[player.dynasty]} dynasty`}>
            {DYNASTY_SYMBOL[player.dynasty]}
          </span>{" "}
          {displayName(player.email)}
          {isCurrentUser && (
            <Text component="span" c="dimmed" fw={400}>
              {" "}
              (you)
            </Text>
          )}
        </Text>
        <Text size="xs" c="dimmed" style={{ whiteSpace: "nowrap" }}>
          lowest {lowest}
        </Text>
      </Group>
      <Group
        gap={4}
        mt={6}
        wrap="wrap"
        aria-label={`${displayName(player.email)}'s points`}
      >
        {COLOURS.map((colour) => (
          <Tooltip
            key={colour}
            label={`${player.points[colour] || 0} ${POINT_NAME[colour]}s`}
          >
            <Badge
              radius="sm"
              size="sm"
              variant="filled"
              style={{
                background: COLOUR_HEX[colour],
                color: "#fff",
                minWidth: 34,
              }}
              aria-label={`${player.points[colour] || 0} ${POINT_NAME[colour]}s`}
            >
              {player.points[colour] || 0}
            </Badge>
          </Tooltip>
        ))}
        <Badge
          radius="sm"
          size="sm"
          variant="filled"
          color="yellow"
          c="#3a2a00"
          aria-label={`${player.treasures} treasures`}
        >
          ★ {player.treasures}
        </Badge>
      </Group>
      <Group gap={6} mt={6} wrap="wrap" align="center">
        <Group
          gap={3}
          wrap="nowrap"
          aria-label={`${displayName(player.email)}'s leaders`}
        >
          {COLOURS.map((colour) => {
            const placed = leaders.find(([, l]) => l.colour === colour);
            return (
              <Tooltip
                key={colour}
                label={`${LEADER_NAME[colour]}${placed ? ` at ${label(placed[0])}` : " in hand"}`}
              >
                <span
                  aria-label={`${LEADER_NAME[colour]}${placed ? ` at ${label(placed[0])}` : " in hand"}`}
                  style={{
                    display: "inline-block",
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: placed ? "#fbf3e2" : "transparent",
                    border: `3px solid ${COLOUR_HEX[colour]}`,
                    opacity: placed ? 1 : 0.4,
                  }}
                />
              </Tooltip>
            );
          })}
        </Group>
        <Text size="xs" c="dimmed">
          {hand} tile{hand === 1 ? "" : "s"} · {player.catastrophes} catastrophe
          {player.catastrophes === 1 ? "" : "s"}
        </Text>
      </Group>
    </Box>
  );
}
