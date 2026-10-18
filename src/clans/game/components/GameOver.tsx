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
import { ClansGameState } from "../types";
import displayName from "../../../shared/utils/displayName";
import createLobby from "../../../high-society/client/createLobby";
import { useUserContext } from "../../../shared/context/useUserContext";
import GameLog from "../../../shared/components/GameLog";
import GameOverReveal from "../../../shared/components/GameOverReveal";
import { COLOUR_HEX, COLOURS, label } from "../board";

export default function GameOver({
  gameState,
  lobbyId,
}: {
  gameState: ClansGameState;
  lobbyId: string;
}) {
  const { user } = useUserContext();
  const [isCreating, setIsCreating] = useState(false);
  const winner = gameState.players.find((p) => p.email === gameState.winner);
  const nextLobbyUID = gameState.nextLobbyUID;
  const results = [...(gameState.results || [])].sort(
    (a, b) => b.total - a.total,
  );
  const held = new Set(gameState.players.map((p) => p.colour));
  const neutral = COLOURS.filter((c) => !held.has(c));

  const goToLobby = useCallback((uid: string) => {
    window.location.hash = `#${uid}`;
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, []);

  const handlePlayAgain = useCallback(async () => {
    setIsCreating(true);
    try {
      const lobby = await createLobby("clans", { rematchOf: lobbyId });
      goToLobby(String(lobby.data.lobbyUID));
    } finally {
      setIsCreating(false);
    }
  }, [lobbyId, goToLobby]);

  return (
    <GameOverReveal celebrate={!!user && gameState.winner === user.email}>
      <Container size="sm" px="md" py="xl">
        <Stack gap="lg">
          <Center>
            <Stack gap={4} align="center">
              <Title order={1}>Game over</Title>
              <Title order={3} c="yellow.4" className="reveal-title">
                {winner
                  ? `${displayName(winner.email)} led the strongest clan!`
                  : "The clans finish level"}
              </Title>
              {gameState.notification?.message && (
                <Text size="sm" c="dimmed" ta="center">
                  {gameState.notification.message}
                </Text>
              )}
            </Stack>
          </Center>

          <Table.ScrollContainer minWidth={480}>
            <Table withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Player</Table.Th>
                  <Table.Th>Clan</Table.Th>
                  <Table.Th ta="right">Track</Table.Th>
                  <Table.Th ta="right">Chips</Table.Th>
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
                    <Table.Td>
                      <Group gap={6} wrap="nowrap">
                        <span
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: 3,
                            background: COLOUR_HEX[r.colour],
                            border: "1px solid rgba(0,0,0,0.5)",
                          }}
                        />
                        {label(r.colour)}
                      </Group>
                    </Table.Td>
                    <Table.Td ta="right">{r.track}</Table.Td>
                    <Table.Td ta="right">{r.chips}</Table.Td>
                    <Table.Td ta="right">{r.total}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
          {neutral.length > 0 && (
            <Text size="sm" c="dimmed" ta="center">
              Clans nobody led:{" "}
              {neutral
                .map((c) => `${label(c)} ${gameState.scores[c]}`)
                .join(", ")}
              .
            </Text>
          )}

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
