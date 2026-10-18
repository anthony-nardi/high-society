import { useCallback, useState } from "react";
import {
  Badge,
  Button,
  Center,
  Container,
  Group,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { EcosystemGameState } from "../types";
import displayName from "../../../shared/utils/displayName";
import createLobby from "../../../high-society/client/createLobby";
import { useUserContext } from "../../../shared/context/useUserContext";
import GameLog from "../../../shared/components/GameLog";
import GameOverReveal from "../../../shared/components/GameOverReveal";
import EcosystemGrid from "./EcosystemGrid";
import { CARD_INFO, CARD_TYPES, gridOf, label } from "../board";

export default function GameOver({
  gameState,
  lobbyId,
}: {
  gameState: EcosystemGameState;
  lobbyId: string;
}) {
  const { user } = useUserContext();
  const [isCreating, setIsCreating] = useState(false);
  const winner = gameState.players.find((p) => p.email === gameState.winner);
  const nextLobbyUID = gameState.nextLobbyUID;
  const results = [...(gameState.results || [])].sort(
    (a, b) => b.total - a.total,
  );

  const goToLobby = useCallback((uid: string) => {
    window.location.hash = `#${uid}`;
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, []);

  const handlePlayAgain = useCallback(async () => {
    setIsCreating(true);
    try {
      const lobby = await createLobby("ecosystem", { rematchOf: lobbyId });
      goToLobby(String(lobby.data.lobbyUID));
    } finally {
      setIsCreating(false);
    }
  }, [lobbyId, goToLobby]);

  return (
    <GameOverReveal celebrate={!!user && gameState.winner === user.email}>
      <Container size="md" px="md" py="xl">
        <Stack gap="lg">
          <Center>
            <Stack gap={4} align="center">
              <Title order={1}>Game over</Title>
              <Title order={3} c="yellow.4" className="reveal-title">
                {winner
                  ? `${displayName(winner.email)} built the richest ecosystem!`
                  : "A shared win"}
              </Title>
              {gameState.notification?.message && (
                <Text size="sm" c="dimmed" ta="center">
                  {gameState.notification.message}
                </Text>
              )}
            </Stack>
          </Center>

          <Table.ScrollContainer minWidth={720}>
            <Table withTableBorder fz="xs" verticalSpacing={4}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Player</Table.Th>
                  {CARD_TYPES.map((t) => (
                    <Table.Th key={t} ta="right" title={label(t)}>
                      {CARD_INFO[t].emoji}
                    </Table.Th>
                  ))}
                  <Table.Th ta="right">Diversity</Table.Th>
                  <Table.Th ta="right">Total</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {results.map((r) => (
                  <Table.Tr
                    key={r.email}
                    style={{
                      fontWeight:
                        r.email === gameState.winner ? 700 : undefined,
                    }}
                  >
                    <Table.Td>
                      <Group gap="xs" wrap="nowrap">
                        {displayName(r.email)}
                        {r.email === user?.email && (
                          <Text component="span" size="xs" c="dimmed">
                            (you)
                          </Text>
                        )}
                        {r.email === gameState.winner && (
                          <Badge color="yellow" radius="sm">
                            Winner
                          </Badge>
                        )}
                      </Group>
                    </Table.Td>
                    {CARD_TYPES.map((t) => (
                      <Table.Td key={t} ta="right">
                        {r.byType[t] ?? "–"}
                      </Table.Td>
                    ))}
                    <Table.Td ta="right">
                      {r.diversity >= 0 ? `+${r.diversity}` : r.diversity}
                      <Text component="span" size="xs" c="dimmed">
                        {" "}
                        ({r.scoringTypes})
                      </Text>
                    </Table.Td>
                    <Table.Td ta="right">{r.total}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
          <Text size="xs" c="dimmed" ta="center">
            Streams: longest 8, second 5. Wolves: most 12, second 8, third 4.
            Diversity: the number of card types that scored, 5 or fewer −5, 6 →
            0, 7 → 3, 8 → 7, 9 or more → 12.
            {gameState.neutral?.discards
              ? ` The neutral hand set aside ${gameState.neutral.discards.filter((c) => c === "STREAM").length} streams and ${gameState.neutral.discards.filter((c) => c === "WOLF").length} wolves.`
              : ""}
          </Text>

          <Stack gap="sm">
            {results.map((r) => {
              const player = gameState.players.find((p) => p.email === r.email);
              return player ? (
                <Stack key={r.email} gap={4} align="center">
                  <Text size="sm" fw={600}>
                    {displayName(r.email)}
                  </Text>
                  <div style={{ maxWidth: "100%", overflowX: "auto" }}>
                    <EcosystemGrid grid={gridOf(player)} size={40} compact />
                  </div>
                </Stack>
              ) : null;
            })}
          </Stack>

          <Center>
            {nextLobbyUID ? (
              <Button onClick={() => goToLobby(nextLobbyUID)}>
                Join the rematch
              </Button>
            ) : (
              <Button onClick={handlePlayAgain} loading={isCreating}>
                Play again
              </Button>
            )}
          </Center>

          <GameLog log={gameState.log || []} />
        </Stack>
      </Container>
    </GameOverReveal>
  );
}
