import { Badge, Box, Group, Text } from "@mantine/core";
import { EcosystemGameState, EcosystemPlayerState } from "../types";
import { useUserContext } from "../../../shared/context/useUserContext";
import displayName, { isBotName } from "../../../shared/utils/displayName";
import ThinkingDots from "../../../shared/components/ThinkingDots";
import EcosystemGrid from "./EcosystemGrid";
import { gridOf, hasChosen, runningScore } from "../board";

/** A rival's ecosystem in miniature, with their running card points. */
export default function PlayerOverview({
  player,
  gameState,
}: {
  player: EcosystemPlayerState;
  gameState: EcosystemGameState;
}) {
  const { user } = useUserContext();
  const isCurrentUser = !!user && player.email === user.email;
  const chosen = hasChosen(gameState, player.email);
  const waiting =
    !chosen &&
    (player.hand || []).length > 0 &&
    gameState.status === "IN_PROGRESS";
  const grid = gridOf(player);
  const score = runningScore(grid);
  const placed = Object.keys(grid).length;
  const last = (gameState.lastPick || []).find((p) => p.email === player.email);

  return (
    <Box
      p="sm"
      data-testid="player-overview"
      style={{
        position: "relative",
        borderRadius: 12,
        border: waiting
          ? "2px solid var(--mantine-color-yellow-5)"
          : "2px solid transparent",
        background: "var(--mantine-color-default)",
        minWidth: 0,
        maxWidth: "100%",
      }}
    >
      {waiting && (
        <Badge
          color="yellow"
          variant="filled"
          radius="sm"
          style={{ position: "absolute", top: -10, left: 12 }}
        >
          {isCurrentUser ? (
            "Your pick"
          ) : isBotName(player.email) ? (
            <>
              Thinking
              <ThinkingDots />
            </>
          ) : (
            "Picking"
          )}
        </Badge>
      )}
      <Group justify="space-between" wrap="nowrap" gap="xs" mt={4}>
        <Text fw={700} truncate style={{ minWidth: 0 }}>
          {displayName(player.email)}
          {isCurrentUser && (
            <Text component="span" c="dimmed" fw={400}>
              {" "}
              (you)
            </Text>
          )}
        </Text>
        <Text size="xs" c="dimmed" style={{ whiteSpace: "nowrap" }}>
          {placed}/20 · {score.total} pts · {score.scoring} types
        </Text>
      </Group>
      <div style={{ marginTop: 6, overflowX: "auto" }}>
        <EcosystemGrid
          grid={grid}
          size={28}
          compact
          highlights={last ? { [last.cell]: "new" } : {}}
        />
      </div>
    </Box>
  );
}
