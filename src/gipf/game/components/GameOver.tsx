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
import { GipfGameState } from "../types";
import displayName from "../../../shared/utils/displayName";
import createLobby from "../../../high-society/client/createLobby";
import { useUserContext } from "../../../shared/context/useUserContext";
import GameLog from "../../../shared/components/GameLog";
import GameOverReveal from "../../../shared/components/GameOverReveal";
import { piecesOf } from "../board";

export default function GameOver({
  gameState,
  lobbyId,
}: {
  gameState: GipfGameState;
  lobbyId: string;
}) {
  const { user } = useUserContext();
  const [isCreating, setIsCreating] = useState(false);
  const winner = gameState.players.find((p) => p.email === gameState.winner);
  const nextLobbyUID = gameState.nextLobbyUID;

  const goToLobby = useCallback((uid: string) => {
    window.location.hash = `#${uid}`;
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, []);

  const handlePlayAgain = useCallback(async () => {
    setIsCreating(true);
    try {
      const lobby = await createLobby("gipf", { rematchOf: lobbyId });
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
                {winner ? `${displayName(winner.email)} wins!` : "Game over"}
              </Title>
              {gameState.notification?.message && (
                <Text size="sm" c="dimmed" ta="center">
                  {gameState.notification.message}
                </Text>
              )}
            </Stack>
          </Center>

          <Table withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Player</Table.Th>
                <Table.Th>Side</Table.Th>
                <Table.Th>In reserve</Table.Th>
                <Table.Th>On the board</Table.Th>
                <Table.Th>Captured</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {gameState.players.map((player) => (
                <Table.Tr
                  key={player.email}
                  style={{
                    fontWeight:
                      player.email === gameState.winner ? 700 : undefined,
                  }}
                >
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      {displayName(player.email)}
                      {player.email === user?.email && (
                        <Text component="span" size="xs" c="dimmed">
                          (you)
                        </Text>
                      )}
                      {player.email === gameState.winner && (
                        <Badge color="yellow" radius="sm">
                          Winner
                        </Badge>
                      )}
                    </Group>
                  </Table.Td>
                  <Table.Td>{player.side.toLowerCase()}</Table.Td>
                  <Table.Td>{player.reserve}</Table.Td>
                  <Table.Td>{piecesOf(gameState, player.side)}</Table.Td>
                  <Table.Td>{player.captured}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>

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
