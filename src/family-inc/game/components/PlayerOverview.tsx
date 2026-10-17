import { Badge, Box, Group, Text } from "@mantine/core";
import { FamilyIncGameState, FamilyIncPlayerState } from "../types";
import { useUserContext } from "../../../shared/context/useUserContext";
import displayName, { isBotName } from "../../../shared/utils/displayName";
import { ChipStack, Diamonds } from "./Chip";
import { chipPoints, count, heldValues, valuesAtRisk } from "../odds";

export default function PlayerOverview({
  player,
  gameState,
}: {
  player: FamilyIncPlayerState;
  gameState: FamilyIncGameState;
}) {
  const { user } = useUserContext();
  const isActivePlayer = player.email === gameState.activePlayer;
  const isCurrentUser = !!user && player.email === user.email;
  const values = heldValues(player.held);
  const atRisk = valuesAtRisk(gameState, player.email);
  const pending = chipPoints(player.held);

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
          <Text fw={700}>
            {displayName(player.email)}
            {isCurrentUser && (
              <Text component="span" c="dimmed" fw={400}>
                {" "}
                (you)
              </Text>
            )}
          </Text>
          <Group gap="xs" align="baseline">
            <Text size="xl" fw={800}>
              {player.score}
            </Text>
            <Text size="sm" c="dimmed">
              point{player.score === 1 ? "" : "s"}
            </Text>
            {pending > 0 && !isActivePlayer && (
              <Text size="sm" c="dimmed">
                · {pending} to bank
              </Text>
            )}
            {player.diamonds > 0 && <Diamonds count={player.diamonds} />}
          </Group>
        </div>

        <Group
          gap={8}
          wrap="wrap"
          aria-label={`${displayName(player.email)}'s chips`}
        >
          {values.length === 0 ? (
            <Text size="sm" c="dimmed">
              No chips in front
            </Text>
          ) : (
            values.map((value) => (
              <ChipStack
                key={value}
                value={value}
                n={count(player.held, value)}
                atRisk={atRisk.includes(value)}
              />
            ))
          )}
        </Group>
      </Group>
    </Box>
  );
}
