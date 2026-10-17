import { Badge, Box, Group, Text } from "@mantine/core";
import { DvonnGameState, DvonnPlayerState, Piece } from "../types";
import { useUserContext } from "../../../shared/context/useUserContext";
import displayName, { isBotName } from "../../../shared/utils/displayName";
import ThinkingDots from "../../../shared/components/ThinkingDots";
import { scores, stacksOf } from "../board";

const FILL: { [piece in Piece]: string } = {
  WHITE: "#f1f1f1",
  BLACK: "#1a1a1a",
  DVONN: "#d9342b",
};

export function PieceIcon({
  piece,
  size = 18,
}: {
  piece: Piece;
  size?: number;
}) {
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
        fill={FILL[piece]}
        stroke={piece === "WHITE" ? "#8a8a8a" : "#000"}
      />
    </svg>
  );
}

export default function PlayerOverview({
  player,
  gameState,
}: {
  player: DvonnPlayerState;
  gameState: DvonnGameState;
}) {
  const { user } = useUserContext();
  const isActivePlayer = player.email === gameState.activePlayer;
  const isCurrentUser = !!user && player.email === user.email;
  const isBot = isBotName(player.email);
  const controlled = scores(gameState)[player.side];
  const stacks = stacksOf(gameState, player.side).length;
  const placing = gameState.phase === "PLACE";

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
            <PieceIcon piece={player.side} />
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
          {placing ? (
            <Text size="xs" c="dimmed">
              {player.pieces} piece{player.pieces === 1 ? "" : "s"} to place
              {player.dvonn > 0 ? ` and ${player.dvonn} DVONN` : ""}
            </Text>
          ) : (
            <Text size="xs" c="dimmed">
              {stacks} stack{stacks === 1 ? "" : "s"} controlled
            </Text>
          )}
        </div>
        <Group
          gap={4}
          align="baseline"
          wrap="nowrap"
          aria-label={`${controlled} pieces controlled`}
        >
          <Text size="xl" fw={800} lh={1}>
            {controlled}
          </Text>
          <Text size="xs" c="dimmed">
            pieces
          </Text>
        </Group>
      </Group>
    </Box>
  );
}
