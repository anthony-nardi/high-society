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
import { TigrisGameState } from "../types";
import displayName from "../../../shared/utils/displayName";
import createLobby from "../../../high-society/client/createLobby";
import { useUserContext } from "../../../shared/context/useUserContext";
import GameLog from "../../../shared/components/GameLog";
import GameOverReveal from "../../../shared/components/GameOverReveal";
import {
  COLOUR_HEX,
  COLOURS,
  DYNASTY_SYMBOL,
  finalSpheres,
  list,
  POINT_NAME,
} from "../board";

export default function GameOver({
  gameState,
  lobbyId,
}: {
  gameState: TigrisGameState;
  lobbyId: string;
}) {
  const { user } = useUserContext();
  const [isCreating, setIsCreating] = useState(false);
  const winners = gameState.winners || [];
  const won = (email: string) => winners.includes(email);
  const results = gameState.results || [];
  const ranked = results
    .map((r) => gameState.players.find((p) => p.email === r.email))
    .filter((p): p is NonNullable<typeof p> => !!p);
  const nextLobbyUID = gameState.nextLobbyUID;

  const goToLobby = useCallback((uid: string) => {
    window.location.hash = `#${uid}`;
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, []);

  const handlePlayAgain = useCallback(async () => {
    setIsCreating(true);
    try {
      const lobby = await createLobby("tigris", { rematchOf: lobbyId });
      goToLobby(String(lobby.data.lobbyUID));
    } finally {
      setIsCreating(false);
    }
  }, [lobbyId, goToLobby]);

  const best = results[0];
  return (
    <GameOverReveal celebrate={!!user && won(user.email ?? "")}>
      <Container size="md" px="md" py="xl">
        <Stack gap="lg">
          <Center>
            <Stack gap={4} align="center">
              <Title order={1}>Game over</Title>
              <Title
                order={3}
                c="yellow.4"
                className="reveal-title"
                ta="center"
              >
                {winners.length === 1 && best
                  ? `${displayName(winners[0])} wins with a lowest sphere of ${best.spheres[0]}!`
                  : `${list(winners.map(displayName))} share the win.`}
              </Title>
              {gameState.notification?.message && (
                <Text size="sm" c="dimmed">
                  {gameState.notification.message}
                </Text>
              )}
            </Stack>
          </Center>

          <Table.ScrollContainer minWidth={560}>
            <Table withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Player</Table.Th>
                  {COLOURS.map((c) => (
                    <Table.Th
                      key={c}
                      ta="right"
                      style={{
                        color:
                          COLOUR_HEX[c] === "#3b3f4a"
                            ? undefined
                            : COLOUR_HEX[c],
                      }}
                    >
                      {POINT_NAME[c]}s
                    </Table.Th>
                  ))}
                  <Table.Th ta="right">Treasures</Table.Th>
                  <Table.Th ta="right">Spheres</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {ranked.map((player) => {
                  const spheres = finalSpheres(player.points, player.treasures);
                  return (
                    <Table.Tr
                      key={player.email}
                      style={{
                        fontWeight: won(player.email) ? 700 : undefined,
                      }}
                    >
                      <Table.Td>
                        <Group gap="xs" wrap="nowrap">
                          <span aria-hidden="true">
                            {DYNASTY_SYMBOL[player.dynasty]}
                          </span>
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
                      {COLOURS.map((c) => (
                        <Table.Td key={c} ta="right">
                          {player.points[c] || 0}
                        </Table.Td>
                      ))}
                      <Table.Td ta="right">{player.treasures}</Table.Td>
                      <Table.Td ta="right">
                        <b>{spheres[0]}</b> · {spheres.slice(1).join(" · ")}
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
          <Text size="xs" c="dimmed" ta="center">
            Treasures are spent on each player's lowest sphere. The highest
            lowest sphere wins; ties look at the next sphere.
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
