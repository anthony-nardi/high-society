import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { HighSocietyGameState } from "../types";
import { getDatabase, onValue, ref } from "firebase/database";
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
import createLobby from "../../client/createLobby";
import { useUserContext } from "../../../shared/context/useUserContext";
import CardFront from "../../card/CardFront";
import MoneyCard from "../../card/MoneyCard";
import { ScoredPlayer } from "../scoring";

const COLUMNS = 7;

/** Second row under each player: their status cards and remaining money. */
function PlayerCards({ player }: { player: ScoredPlayer }) {
  const money = [...player.moneyCards].sort((a, b) => Number(a) - Number(b));
  return (
    <Group gap="xl" align="flex-start" wrap="wrap" py={4}>
      <div>
        <Text size="xs" c="dimmed" mb={4}>
          Status cards
        </Text>
        {player.statusCards.length === 0 ? (
          <Text size="sm" c="dimmed">
            None
          </Text>
        ) : (
          <Group gap={4} wrap="wrap">
            {player.statusCards.map((card, index) => (
              <CardFront key={`${card}-${index}`} card={card} size="sm" />
            ))}
          </Group>
        )}
      </div>
      <div>
        <Text size="xs" c="dimmed" mb={4}>
          Money left ({player.moneyLeft})
        </Text>
        {money.length === 0 ? (
          <Text size="sm" c="dimmed">
            None
          </Text>
        ) : (
          <Group gap={4} wrap="wrap" aria-label={`Money: ${money.join(", ")}`}>
            {money.map((card) => (
              <div key={card} style={{ width: 40 }}>
                <MoneyCard value={card} />
              </div>
            ))}
          </Group>
        )}
      </div>
    </Group>
  );
}

function formatMultiplier(multiplier: number) {
  if (multiplier === 1) return "—";
  return multiplier > 1 ? `×${multiplier}` : `×1/${1 / multiplier}`;
}

export default function GameOver({ lobbyId }: { lobbyId: string }) {
  const { user } = useUserContext();
  const [gameData, setGameData] = useState<null | HighSocietyGameState>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const db = getDatabase();
    const lobbyRef = ref(db, "games/" + lobbyId + "/public");

    const unsubscribe = onValue(lobbyRef, (snapshot) => {
      setGameData(snapshot.val() as HighSocietyGameState);
    });

    return () => unsubscribe();
  }, [lobbyId]);

  const results = useMemo(
    () => (gameData ? scoreGame(gameData.players) : []),
    [gameData],
  );
  const winners = results.filter((p) => p.winner);
  const eliminated = results.filter((p) => p.eliminated);
  const nextLobbyUID = gameData?.nextLobbyUID;

  const goToLobby = useCallback((uid: string) => {
    window.location.hash = `#${uid}`;
    // The hash change alone does not fire popstate in every browser.
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, []);

  const handlePlayAgain = useCallback(async () => {
    setIsCreating(true);
    try {
      const lobby = await createLobby("high-society", { rematchOf: lobbyId });
      goToLobby(String(lobby.data.lobbyUID));
    } finally {
      setIsCreating(false);
    }
  }, [lobbyId, goToLobby]);

  if (!gameData) {
    return null;
  }

  const headline =
    winners.length === 1
      ? `${displayName(winners[0].email)} wins!`
      : winners.length > 1
        ? `${winners.map((p) => displayName(p.email)).join(" and ")} share the win`
        : "Nobody wins";

  return (
    <Container size="md" px="md" py="xl">
      <Stack gap="lg">
        <Center>
          <Stack gap={4} align="center">
            <Title order={1}>Game over</Title>
            <Title order={3} c="yellow.4">
              {headline}
            </Title>
            {eliminated.length > 0 && (
              <Text size="sm" c="dimmed" ta="center">
                {eliminated.map((p) => displayName(p.email)).join(", ")}{" "}
                {eliminated.length === 1 ? "had" : "shared"} the least money
                left and {eliminated.length === 1 ? "is" : "are"} out of the
                running.
              </Text>
            )}
          </Stack>
        </Center>

        <Table.ScrollContainer minWidth={560}>
          <Table withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>#</Table.Th>
                <Table.Th>Player</Table.Th>
                <Table.Th>Luxury</Table.Th>
                <Table.Th>Scandal</Table.Th>
                <Table.Th>Multiplier</Table.Th>
                <Table.Th>Score</Table.Th>
                <Table.Th>Money left</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {results.map((player) => (
                <Fragment key={player.email}>
                  <Table.Tr
                    style={{
                      opacity: player.eliminated ? 0.6 : 1,
                      fontWeight: player.winner ? 700 : undefined,
                    }}
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
                        {player.eliminated && (
                          <Badge color="red" variant="light" radius="sm">
                            Least money
                          </Badge>
                        )}
                      </Group>
                    </Table.Td>
                    <Table.Td>{player.luxury}</Table.Td>
                    <Table.Td>
                      {player.penalty ? `−${player.penalty}` : "—"}
                    </Table.Td>
                    <Table.Td>{formatMultiplier(player.multiplier)}</Table.Td>
                    <Table.Td>{player.finalScore}</Table.Td>
                    <Table.Td>{player.moneyLeft}</Table.Td>
                  </Table.Tr>
                  <Table.Tr style={{ opacity: player.eliminated ? 0.6 : 1 }}>
                    <Table.Td colSpan={COLUMNS}>
                      <PlayerCards player={player} />
                    </Table.Td>
                  </Table.Tr>
                </Fragment>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>

        <Center>
          <Group>
            {nextLobbyUID ? (
              <Button onClick={() => goToLobby(nextLobbyUID)}>
                Join the rematch
              </Button>
            ) : (
              <Button onClick={handlePlayAgain} loading={isCreating}>
                Play again
              </Button>
            )}
          </Group>
        </Center>
        {!nextLobbyUID && (
          <Text size="xs" c="dimmed" ta="center">
            Play again opens a new lobby and gives everyone here a button to
            join it.
          </Text>
        )}
      </Stack>
    </Container>
  );
}
