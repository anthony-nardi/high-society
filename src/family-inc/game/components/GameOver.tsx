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
import { FamilyIncGameState } from "../types";
import displayName from "../../../shared/utils/displayName";
import createLobby from "../../../high-society/client/createLobby";
import { useUserContext } from "../../../shared/context/useUserContext";
import GameLog from "../../../shared/components/GameLog";
import { Diamonds } from "./Chip";
import { chipPoints } from "../odds";

export default function GameOver({
  gameState,
  lobbyId,
}: {
  gameState: FamilyIncGameState;
  lobbyId: string;
}) {
  const { user } = useUserContext();
  const [isCreating, setIsCreating] = useState(false);

  const ranked = [...gameState.players].sort((a, b) => b.score - a.score);
  const winner = ranked.find((p) => p.email === gameState.winner) || ranked[0];
  const nextLobbyUID = gameState.nextLobbyUID;

  const goToLobby = useCallback((uid: string) => {
    window.location.hash = `#${uid}`;
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, []);

  const handlePlayAgain = useCallback(async () => {
    setIsCreating(true);
    try {
      const lobby = await createLobby("family-inc", { rematchOf: lobbyId });
      goToLobby(String(lobby.data.lobbyUID));
    } finally {
      setIsCreating(false);
    }
  }, [lobbyId, goToLobby]);

  return (
    <Container size="md" px="md" py="xl">
      <Stack gap="lg">
        <Center>
          <Stack gap={4} align="center">
            <Title order={1}>Game over</Title>
            <Title order={3} c="yellow.4">
              {displayName(winner.email)} wins with {winner.score} points!
            </Title>
            <Text size="sm" c="dimmed" ta="center">
              First to 100 points, banked at the start of a turn or from three
              diamonds.
            </Text>
          </Stack>
        </Center>

        <Table.ScrollContainer minWidth={360}>
          <Table withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>#</Table.Th>
                <Table.Th>Player</Table.Th>
                <Table.Th>Points</Table.Th>
                <Table.Th>Unbanked</Table.Th>
                <Table.Th>Diamonds</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {ranked.map((player, index) => (
                <Table.Tr
                  key={player.email}
                  style={{
                    fontWeight: player.email === winner.email ? 700 : undefined,
                  }}
                >
                  <Table.Td>{index + 1}</Table.Td>
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      {displayName(player.email)}
                      {player.email === user?.email && (
                        <Text component="span" size="xs" c="dimmed">
                          (you)
                        </Text>
                      )}
                      {player.email === winner.email && (
                        <Badge color="yellow" radius="sm">
                          Winner
                        </Badge>
                      )}
                    </Group>
                  </Table.Td>
                  <Table.Td>{player.score}</Table.Td>
                  <Table.Td>{chipPoints(player.held) || "—"}</Table.Td>
                  <Table.Td>
                    {player.diamonds ? <Diamonds count={player.diamonds} size={20} /> : "—"}
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
        {!nextLobbyUID && (
          <Text size="xs" c="dimmed" ta="center">
            Play again opens a new lobby with the same bots and gives everyone
            here a button to join it.
          </Text>
        )}

        <GameLog log={gameState.log || []} />
      </Stack>
    </Container>
  );
}
