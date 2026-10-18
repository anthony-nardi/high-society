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
import { FujiFlushGameState } from "../types";
import displayName from "../../../shared/utils/displayName";
import createLobby from "../../../high-society/client/createLobby";
import { useUserContext } from "../../../shared/context/useUserContext";
import GameLog from "../../../shared/components/GameLog";
import GameOverReveal from "../../../shared/components/GameOverReveal";
import { cardsLeft, list } from "../board";

export default function GameOver({
  gameState,
  lobbyId,
}: {
  gameState: FujiFlushGameState;
  lobbyId: string;
}) {
  const { user } = useUserContext();
  const [isCreating, setIsCreating] = useState(false);
  const winners = gameState.winners || [];
  const won = (email: string) => winners.includes(email);
  const ranked = [...gameState.players].sort(
    (a, b) =>
      Number(won(b.email)) - Number(won(a.email)) ||
      cardsLeft(a) - cardsLeft(b) ||
      b.pushed - a.pushed,
  );
  const nextLobbyUID = gameState.nextLobbyUID;

  const goToLobby = useCallback((uid: string) => {
    window.location.hash = `#${uid}`;
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, []);

  const handlePlayAgain = useCallback(async () => {
    setIsCreating(true);
    try {
      const lobby = await createLobby("fuji-flush", { rematchOf: lobbyId });
      goToLobby(String(lobby.data.lobbyUID));
    } finally {
      setIsCreating(false);
    }
  }, [lobbyId, goToLobby]);

  return (
    <GameOverReveal celebrate={!!user && won(user.email ?? "")}>
      <Container size="md" px="md" py="xl">
        <Stack gap="lg">
          <Center>
            <Stack gap={4} align="center">
              <Title order={1}>Game over</Title>
              <Title order={3} c="yellow.4" className="reveal-title">
                {winners.length === 1
                  ? `${displayName(winners[0])} pushed the last card through!`
                  : `${list(winners.map(displayName))} pushed their last cards through together!`}
              </Title>
            </Stack>
          </Center>

          <Table.ScrollContainer minWidth={420}>
            <Table withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Player</Table.Th>
                  <Table.Th>Pushed through</Table.Th>
                  <Table.Th>Flushed</Table.Th>
                  <Table.Th>Cards left</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {ranked.map((player) => (
                  <Table.Tr
                    key={player.email}
                    style={{ fontWeight: won(player.email) ? 700 : undefined }}
                  >
                    <Table.Td>
                      <Group gap="xs" wrap="nowrap">
                        {displayName(player.email)}
                        {player.email === user?.email && (
                          <Text component="span" size="xs" c="dimmed">
                            (you)
                          </Text>
                        )}
                        {won(player.email) && (
                          <Badge color="yellow" radius="sm">
                            Winner
                          </Badge>
                        )}
                      </Group>
                    </Table.Td>
                    <Table.Td>{player.pushed}</Table.Td>
                    <Table.Td>{player.flushed}</Table.Td>
                    <Table.Td>{cardsLeft(player)}</Table.Td>
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
