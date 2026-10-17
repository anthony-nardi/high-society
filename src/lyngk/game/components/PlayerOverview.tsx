import { Badge, Box, Group, Text } from "@mantine/core";
import { LyngkGameState, LyngkPlayerState, Piece } from "../types";
import { useUserContext } from "../../../shared/context/useUserContext";
import displayName, { isBotName } from "../../../shared/utils/displayName";
import ThinkingDots from "../../../shared/components/ThinkingDots";
import { scoreOf } from "../board";
import { FILL, STROKE } from "../pieces";

export function PieceIcon({
  piece,
  size = 18,
  hollow = false,
}: {
  piece: Piece;
  size?: number;
  hollow?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      {!hollow && <circle cx="11" cy="11.5" r="8" fill="#000" opacity="0.4" />}
      <circle
        cx="10"
        cy="10"
        r="8"
        fill={hollow ? "none" : FILL[piece]}
        stroke={hollow ? "rgba(255,255,255,0.3)" : STROKE[piece]}
        strokeDasharray={hollow ? "3 2" : undefined}
      />
    </svg>
  );
}

export default function PlayerOverview({
  player,
  gameState,
}: {
  player: LyngkPlayerState;
  gameState: LyngkGameState;
}) {
  const { user } = useUserContext();
  const isActivePlayer = player.email === gameState.activePlayer;
  const isCurrentUser = !!user && player.email === user.email;
  const isBot = isBotName(player.email);
  const score = scoreOf(gameState, player.email);
  const colours = player.colours || [];

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
          <Text fw={700} truncate>
            {displayName(player.email)}
            {isCurrentUser && (
              <Text component="span" c="dimmed" fw={400}>
                {" "}
                (you)
              </Text>
            )}
          </Text>
          <Group
            gap={4}
            align="center"
            mt={2}
            aria-label={
              colours.length
                ? `Colours: ${colours.map((c) => c.toLowerCase()).join(", ")}`
                : "No colours claimed yet"
            }
          >
            {colours.map((c) => (
              <PieceIcon key={c} piece={c} />
            ))}
            {Array.from({ length: 2 - colours.length }, (_, i) => (
              <PieceIcon key={`empty-${i}`} piece="IVORY" hollow />
            ))}
            <Text size="xs" c="dimmed" ml={4}>
              {colours.length
                ? `${score[1]} four${score[1] === 1 ? "" : "s"} · ${score[2]} three${score[2] === 1 ? "" : "s"}`
                : "no colours yet"}
            </Text>
          </Group>
        </div>
        <Group
          gap={4}
          align="baseline"
          wrap="nowrap"
          aria-label={`${player.scored} stacks of five`}
        >
          <Text size="xl" fw={800} lh={1}>
            {player.scored}
          </Text>
          <Text size="xs" c="dimmed">
            fives
          </Text>
        </Group>
      </Group>
    </Box>
  );
}
