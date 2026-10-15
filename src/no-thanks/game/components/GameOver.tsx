import { Fragment, useCallback, useMemo, useState } from "react";
import { NoThanksGameState } from "../types";
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
import scoreGame from "../scoring";
import displayName from "../../../shared/utils/displayName";
import createLobby from "../../../high-society/client/createLobby";
import { useUserContext } from "../../../shared/context/useUserContext";
import GameLog from "../../../shared/components/GameLog";
import PlayerCards from "./player/PlayerCards";

const COLUMNS = 5;

export default function GameOver({
  gameState,
  lobbyId,
}: {
  gameState: NoThanksGameState;
  lobbyId: string;
}) {
  const { user } = useUserContext();
  const [isCreating, setIsCreating] = useState(false);

  const results = useMemo(() => scoreGame(gameState.players), [gameState]);
  const winners = results.filter((p) => p.winner);
  const nextLobbyUID = gameState.nextLobbyUID;

  const goToLobby = useCallback((uid: string) => {
    window.location.hash = `#${uid}`;
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, []);

  const handlePlayAgain = useCallback(async () => {
    setIsCreating(true);
    try {
      const lobby = await createLobby("no-thanks", { rematchOf: lobbyId });
      goToLobby(String(lobby.data.lobbyUID));
    } finally {
      setIsCreating(false);
    }
  }, [lobbyId, goToLobby]);

  const headline =
    winners.length === 1
      ? `${displayName(winners[0].email)} wins with ${winners[0].score} points!`
      : `${winners.map((p) => displayName(p.email)).join(" and ")} share the win`;

  return (
    <Container size="md" px="md" py="xl">
      <Stack gap="lg">
        <Center>
          <Stack gap={4} align="center">
            <Title order={1}>Game over</Title>
            <Title order={3} c="yellow.4">
              {headline}
            </Title>
            <Text size="sm" c="dimmed" ta="center">
              Lowest score wins. Each run counts only its lowest card, and every
              chip is worth one point off.
            </Text>
          </Stack>
        </Center>

        <Table.ScrollContainer minWidth={480}>
          <Table withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>#</Table.Th>
                <Table.Th>Player</Table.Th>
                <Table.Th>Cards</Table.Th>
                <Table.Th>Chips</Table.Th>
                <Table.Th>Score</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {results.map((player) => (
                <Fragment key={player.email}>
                  <Table.Tr
                    style={{ fontWeight: player.winner ? 700 : undefined }}
                  >
                    <Table.Td>{player.rank}</Table.Td>
                    <Table.Td>
                      <Group gap="xs" wrap="nowrap">
                        {displayName(player.email)}
                        {player.email === user?.email && (
                          <Text component="span" size="xs" c="dimmed">
                            (you)
                          </Text>
                        )}
                        {player.winner && (
                          <Badge color="yellow" radius="sm">
                            Winner
                          </Badge>
                        )}
                      </Group>
                    </Table.Td>
                    <Table.Td>{player.cardPoints}</Table.Td>
                    <Table.Td>−{player.chips}</Table.Td>
                    <Table.Td>{player.score}</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td colSpan={COLUMNS}>
                      <PlayerCards cards={player.cards} size="md" />
                    </Table.Td>
                  </Table.Tr>
                </Fragment>
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
            Play again opens a new lobby and gives everyone here a button to
            join it.
          </Text>
        )}

        <GameLog log={gameState.log || []} />
      </Stack>
    </Container>
  );
}
