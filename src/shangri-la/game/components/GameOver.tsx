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
import { ShangriLaGameState } from "../types";
import displayName from "../../../shared/utils/displayName";
import createLobby from "../../../high-society/client/createLobby";
import { useUserContext } from "../../../shared/context/useUserContext";
import GameLog from "../../../shared/components/GameLog";
import GameOverReveal from "../../../shared/components/GameOverReveal";
import { COLOUR_FILL, scoreOf } from "../board";

export default function GameOver({
  gameState,
  lobbyId,
}: {
  gameState: ShangriLaGameState;
  lobbyId: string;
}) {
  const { user } = useUserContext();
  const [isCreating, setIsCreating] = useState(false);
  const winner = gameState.players.find((p) => p.email === gameState.winner);
  const nextLobbyUID = gameState.nextLobbyUID;
  const ranked = [...gameState.players]
    .map((p) => ({
      p,
      s:
        gameState.scores?.find((s) => s.email === p.email) ??
        scoreOf(gameState, p.email),
    }))
    .sort((a, b) => b.s.masters - a.s.masters || b.s.villages - a.s.villages);

  const goToLobby = useCallback((uid: string) => {
    window.location.hash = `#${uid}`;
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, []);

  const handlePlayAgain = useCallback(async () => {
    setIsCreating(true);
    try {
      const lobby = await createLobby("shangri-la", { rematchOf: lobbyId });
      goToLobby(String(lobby.data.lobbyUID));
    } finally {
      setIsCreating(false);
    }
  }, [lobbyId, goToLobby]);

  return (
    <GameOverReveal>
      <Container size="sm" px="md" py="xl">
        <Stack gap="lg">
          <Center>
            <Stack gap={4} align="center">
              <Title order={1}>Game over</Title>
              <Title order={3} c="yellow.4" className="reveal-title">
                {winner ? `${displayName(winner.email)} wins!` : "A shared win"}
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
                <Table.Th>Masters</Table.Th>
                <Table.Th>Villages</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {ranked.map(({ p, s }) => (
                <Table.Tr
                  key={p.email}
                  style={{
                    fontWeight: p.email === gameState.winner ? 700 : undefined,
                  }}
                >
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      <span
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: 3,
                          background: COLOUR_FILL[p.colour],
                          border: "1px solid #222",
                        }}
                      />
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
                  <Table.Td>{s.masters}</Table.Td>
                  <Table.Td>{s.villages}</Table.Td>
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
