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
import { CoralReefGameState } from "../types";
import displayName from "../../../shared/utils/displayName";
import createLobby from "../../../high-society/client/createLobby";
import { useUserContext } from "../../../shared/context/useUserContext";
import GameLog from "../../../shared/components/GameLog";
import GameOverReveal from "../../../shared/components/GameOverReveal";
import ReefGrid from "./ReefGrid";
import { CARD_INFO, CARD_TYPES, gridOf, label } from "../board";

export default function GameOver({
  gameState,
  lobbyId,
}: {
  gameState: CoralReefGameState;
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
      const lobby = await createLobby("coral-reef", { rematchOf: lobbyId });
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
                  ? `${displayName(winner.email)} built the richest reef!`
                  : "A shared win"}
              </Title>
              {gameState.notification?.message && (
                <Text size="sm" c="dimmed" ta="center">
                  {gameState.notification.message}
                </Text>
              )}
            </Stack>
          </Center>

          <Table.ScrollContainer minWidth={860}>
            <Table withTableBorder fz="xs" verticalSpacing={4}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Player</Table.Th>
                  {CARD_TYPES.map((t) => (
                    <Table.Th key={t} ta="right" title={label(t)}>
                      {CARD_INFO[t].emoji}
                    </Table.Th>
                  ))}
                  <Table.Th ta="right">Producers</Table.Th>
                  <Table.Th ta="right">Prey</Table.Th>
                  <Table.Th ta="right">Predators</Table.Th>
                  <Table.Th ta="right">Food web</Table.Th>
                  <Table.Th ta="right">Other</Table.Th>
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
                    <Table.Td ta="right">{r.producers}</Table.Td>
                    <Table.Td ta="right">{r.prey}</Table.Td>
                    <Table.Td ta="right">{r.predators}</Table.Td>
                    <Table.Td ta="right">+{r.foodWeb}</Table.Td>
                    <Table.Td ta="right">{r.other}</Table.Td>
                    <Table.Td ta="right">{r.total}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
          <Text size="xs" c="dimmed" ta="center">
            Plankton: most 12, second 8, third 4. The food web bonus is the
            lowest of producers, prey and predators, added again. Cards a whale
            turned facedown are shown as backs.
            {gameState.neutral?.discards
              ? ` The neutral hand set aside ${gameState.neutral.discards.filter((c) => c === "PLANKTON").length} plankton.`
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
                    <ReefGrid
                      grid={gridOf(player)}
                      size={40}
                      compact
                      flipped={r.flipped || []}
                    />
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
