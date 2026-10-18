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
import { TwixtGameState } from "../types";
import displayName from "../../../shared/utils/displayName";
import createLobby from "../../../high-society/client/createLobby";
import { useUserContext } from "../../../shared/context/useUserContext";
import GameLog from "../../../shared/components/GameLog";
import GameOverReveal from "../../../shared/components/GameOverReveal";
import { SIDE_COLOUR } from "../board";

export default function GameOver({
  gameState,
  lobbyId,
}: {
  gameState: TwixtGameState;
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
      const lobby = await createLobby("twixt", { rematchOf: lobbyId });
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
                  ? `${displayName(winner.email)} gets across!`
                  : "A draw"}
              </Title>
              {gameState.notification?.message && (
                <Text size="sm" c="dimmed" ta="center">
                  {gameState.notification.message}
                </Text>
              )}
            </Stack>
          </Center>

          <Table.ScrollContainer minWidth={360}>
            <Table withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Player</Table.Th>
                  <Table.Th>Side</Table.Th>
                  <Table.Th ta="right">Pegs</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {gameState.players.map((p) => (
                  <Table.Tr
                    key={p.email}
                    style={{
                      fontWeight:
                        p.email === gameState.winner ? 700 : undefined,
                    }}
                  >
                    <Table.Td>
                      <Group gap="xs" wrap="nowrap">
                        {displayName(p.email)}
                        {p.email === user?.email && (
                          <Text component="span" size="xs" c="dimmed">
                            (you)
                          </Text>
                        )}
                        {p.email === gameState.winner && (
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
                            borderRadius: "50%",
                            background: SIDE_COLOUR[p.side],
                            border: "1px solid rgba(0,0,0,0.5)",
                          }}
                        />
                        {p.side === "RED" ? "Red" : "Black"}
                      </Group>
                    </Table.Td>
                    <Table.Td ta="right">
                      {
                        Object.values(gameState.pegs || {}).filter(
                          (s) => s === p.side,
                        ).length
                      }
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>

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
