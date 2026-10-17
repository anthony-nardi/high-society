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
import { ForSaleGameState } from "../types";
import displayName from "../../../shared/utils/displayName";
import createLobby from "../../../high-society/client/createLobby";
import { useUserContext } from "../../../shared/context/useUserContext";
import GameLog from "../../../shared/components/GameLog";
import GameOverReveal from "../../../shared/components/GameOverReveal";
import ChequeCard from "./ChequeCard";
import { chequeTotal, money, totalOf } from "../money";

export default function GameOver({
  gameState,
  lobbyId,
}: {
  gameState: ForSaleGameState;
  lobbyId: string;
}) {
  const { user } = useUserContext();
  const [isCreating, setIsCreating] = useState(false);
  const ranked = [...gameState.players].sort(
    (a, b) => totalOf(b) - totalOf(a) || b.money - a.money,
  );
  const winner = gameState.players.find((p) => p.email === gameState.winner);
  const nextLobbyUID = gameState.nextLobbyUID;

  const goToLobby = useCallback((uid: string) => {
    window.location.hash = `#${uid}`;
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, []);

  const handlePlayAgain = useCallback(async () => {
    setIsCreating(true);
    try {
      const lobby = await createLobby("for-sale", { rematchOf: lobbyId });
      goToLobby(String(lobby.data.lobbyUID));
    } finally {
      setIsCreating(false);
    }
  }, [lobbyId, goToLobby]);

  return (
    <GameOverReveal>
      <Container size="md" px="md" py="xl">
        <Stack gap="lg">
          <Center>
            <Stack gap={4} align="center">
              <Title order={1}>Game over</Title>
              <Title order={3} c="yellow.4" className="reveal-title">
                {winner
                  ? `${displayName(winner.email)} wins with ${money(totalOf(winner))}!`
                  : "A shared win"}
              </Title>
            </Stack>
          </Center>

          <Table withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Player</Table.Th>
                <Table.Th>Cheques</Table.Th>
                <Table.Th>Cash</Table.Th>
                <Table.Th>Total</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {ranked.map((player) => (
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
                  <Table.Td>
                    <Group gap={3} wrap="wrap" align="center">
                      {[...(player.cheques || [])]
                        .sort((a, b) => b - a)
                        .map((c, i) => (
                          <ChequeCard key={i} amount={c} width={30} />
                        ))}
                      <Text size="sm" ml={4}>
                        {money(chequeTotal(player))}
                      </Text>
                    </Group>
                  </Table.Td>
                  <Table.Td>{money(player.money)}</Table.Td>
                  <Table.Td>{money(totalOf(player))}</Table.Td>
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
