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
import type { PushGameState } from "../types";
import displayName from "../../../shared/utils/displayName";
import createLobby from "../../../high-society/client/createLobby";
import { useUserContext } from "../../../shared/context/useUserContext";
import GameLog from "../../../shared/components/GameLog";
import GameOverReveal from "../../../shared/components/GameOverReveal";
import { cardCount, points, scoreOf } from "../board";

export default function GameOver({
  gameState,
  lobbyId,
}: {
  gameState: PushGameState;
  lobbyId: string;
}) {
  const { user } = useUserContext();
  const [isCreating, setIsCreating] = useState(false);
  const winners = gameState.winners || [];
  const won = (email: string) => winners.includes(email);
  const ranked = [...gameState.players].sort(
    (a, b) => scoreOf(b) - scoreOf(a) || cardCount(b) - cardCount(a),
  );
  const nextLobbyUID = gameState.nextLobbyUID;

  const goToLobby = useCallback((uid: string) => {
    window.location.hash = `#${uid}`;
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, []);

  const handlePlayAgain = useCallback(async () => {
    setIsCreating(true);
    try {
      const lobby = await createLobby("push", { rematchOf: lobbyId });
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
                  ? `${displayName(winners[0])} pushed it furthest with ${scoreOf(ranked[0])} points!`
                  : `${winners.map(displayName).join(" and ")} share the win with ${scoreOf(ranked[0])} points.`}
              </Title>
            </Stack>
          </Center>

          <Table.ScrollContainer minWidth={420}>
            <Table withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Player</Table.Th>
                  <Table.Th ta="right">In the zone</Table.Th>
                  <Table.Th ta="right">Protected</Table.Th>
                  <Table.Th ta="right">Cards</Table.Th>
                  <Table.Th ta="right">Points</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {ranked.map((p) => (
                  <Table.Tr
                    key={p.email}
                    style={{ fontWeight: won(p.email) ? 700 : undefined }}
                  >
                    <Table.Td>
                      <Group gap="xs" wrap="nowrap">
                        {displayName(p.email)}
                        {p.email === user?.email && (
                          <Text component="span" size="xs" c="dimmed">
                            (you)
                          </Text>
                        )}
                        {won(p.email) && (
                          <Badge color="yellow" radius="sm">
                            Winner
                          </Badge>
                        )}
                      </Group>
                    </Table.Td>
                    <Table.Td ta="right">{points(p.bench || [])}</Table.Td>
                    <Table.Td ta="right">{points(p.bank || [])}</Table.Td>
                    <Table.Td ta="right">{cardCount(p)}</Table.Td>
                    <Table.Td ta="right">{scoreOf(p)}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
          <Text size="xs" c="dimmed" ta="center">
            Points are the numbers on every card in the zone and protected. Ties
            go to whoever holds more cards.
          </Text>

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
