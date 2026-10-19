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
import type { MediciGameState } from "../types";
import displayName from "../../../shared/utils/displayName";
import createLobby from "../../../high-society/client/createLobby";
import { useUserContext } from "../../../shared/context/useUserContext";
import GameLog from "../../../shared/components/GameLog";
import GameOverReveal from "../../../shared/components/GameOverReveal";
import { COMMODITIES, COMMODITY_INFO, commodityName } from "../board";
import { Ledger } from "./DayLedger";

export default function GameOver({
  gameState,
  lobbyId,
}: {
  gameState: MediciGameState;
  lobbyId: string;
}) {
  const { user } = useUserContext();
  const [isCreating, setIsCreating] = useState(false);
  const winners = gameState.winners || [];
  const won = (email: string) => winners.includes(email);
  const ranked = [...gameState.players].sort((a, b) => b.money - a.money);
  const nextLobbyUID = gameState.nextLobbyUID;

  const goToLobby = useCallback((uid: string) => {
    window.location.hash = `#${uid}`;
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, []);

  const handlePlayAgain = useCallback(async () => {
    setIsCreating(true);
    try {
      const lobby = await createLobby("medici", { rematchOf: lobbyId });
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
                  ? `${displayName(winners[0])} is the richest house with ${ranked[0].money} florins!`
                  : `${winners.map(displayName).join(" and ")} share the win with ${ranked[0].money} florins.`}
              </Title>
            </Stack>
          </Center>

          <Table.ScrollContainer minWidth={480}>
            <Table withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Player</Table.Th>
                  <Table.Th ta="right">Florins</Table.Th>
                  {COMMODITIES.map((c) => (
                    <Table.Th key={c} ta="right" title={commodityName(c)}>
                      {COMMODITY_INFO[c].emblem}
                    </Table.Th>
                  ))}
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
                    <Table.Td ta="right">{p.money}</Table.Td>
                    {COMMODITIES.map((c) => (
                      <Table.Td key={c} ta="right">
                        {p.tracks[c]}
                      </Table.Td>
                    ))}
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
          <Text size="xs" c="dimmed" ta="center">
            Final levels on the five commodity tracks, 0 to 7.
          </Text>

          {gameState.dayScoring && (
            <Stack gap="xs">
              <Title order={4}>Day 3 ledger</Title>
              <Ledger
                scoring={gameState.dayScoring}
                gameState={gameState}
                me={user?.email}
              />
            </Stack>
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
