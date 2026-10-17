import { Badge, Group, Paper, Stack, Text } from "@mantine/core";
import { FamilyIncGameState } from "../types";
import Chip from "./Chip";
import { bustChance, pileSize, totalChips } from "../odds";
import displayName from "../../../shared/utils/displayName";

const OUTCOME_LABEL = {
  bust: { title: "Bust", colour: "red" },
  diamond: { title: "Bust, with a diamond", colour: "yellow" },
  fifty: { title: "Three diamonds: fifty points", colour: "green" },
  stop: { title: "Stopped", colour: "blue" },
} as const;

/** The pile, the chips drawn this turn, the odds, and what just happened. */
export default function SharedBoard({
  gameState,
}: {
  gameState: FamilyIncGameState;
}) {
  const active = gameState.players.find(
    (p) => p.email === gameState.activePlayer
  );
  const drawn = gameState.drawnThisTurn || [];
  const chance = active ? bustChance(gameState.pile, active.held) : 0;
  const outcome = gameState.lastOutcome
    ? OUTCOME_LABEL[gameState.lastOutcome]
    : null;
  const inFront = gameState.players.reduce(
    (sum, p) => sum + totalChips(p.held),
    0
  );

  return (
    <Stack gap="sm" align="center" w="100%">
      <Group gap="sm" justify="center">
        <Badge variant="light" radius="sm" size="lg">
          Turn {gameState.turn}
        </Badge>
        <Badge
          variant="light"
          color="gray"
          radius="sm"
          size="lg"
          title="Everyone can count: 135 chips minus those on the table and those out of the game."
        >
          {pileSize(gameState.pile)} in the pile · {inFront} on the table
        </Badge>
        <Badge variant="light" color="gray" radius="sm" size="lg">
          First to 100
        </Badge>
      </Group>

      {outcome && drawn.length === 0 && gameState.notification && (
        <Paper
          withBorder
          radius="md"
          px="md"
          py="xs"
          style={{
            borderColor: `var(--mantine-color-${outcome.colour}-5)`,
            background: `rgba(255, 255, 255, 0.04)`,
          }}
          data-testid="outcome-banner"
        >
          <Text size="sm" ta="center" fw={600}>
            {outcome.title}
          </Text>
          <Text size="xs" ta="center" c="dimmed">
            {displayName(gameState.notification.title.split(" ")[0])}{" "}
            {gameState.notification.title.split(" ").slice(1).join(" ")}
          </Text>
        </Paper>
      )}

      <Stack gap={4} align="center" w="100%">
        <Text size="sm" c="dimmed">
          {active ? `${displayName(active.email)}'s turn` : ""}
          {drawn.length > 0
            ? `: ${drawn.length} chip${drawn.length === 1 ? "" : "s"} drawn`
            : ": nothing drawn yet"}
        </Text>
        <Group gap={8} justify="center" wrap="wrap" data-testid="drawn-chips">
          {drawn.map((value, index) => (
            <Chip
              key={`${value}-${index}`}
              value={value}
              size={56}
              highlighted={index === drawn.length - 1}
            />
          ))}
          {drawn.length === 0 && (
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                border: "2px dashed var(--mantine-color-default-border)",
              }}
              aria-hidden="true"
            />
          )}
        </Group>
        {active && drawn.length > 0 && (
          <Text
            size="sm"
            fw={600}
            c={chance >= 0.4 ? "red.4" : chance >= 0.2 ? "yellow.4" : "green.4"}
          >
            Next draw busts {Math.round(chance * 100)}% of the time
          </Text>
        )}
      </Stack>
    </Stack>
  );
}
