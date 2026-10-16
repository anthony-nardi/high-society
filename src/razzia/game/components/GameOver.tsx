import { Fragment, useCallback, useMemo, useState } from "react";
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
import { RazziaGameState } from "../types";
import scoreGame, { categoryLabel } from "../scoring";
import displayName from "../../../shared/utils/displayName";
import createLobby from "../../../high-society/client/createLobby";
import { useUserContext } from "../../../shared/context/useUserContext";
import GameLog from "../../../shared/components/GameLog";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "../cardInfo";
import LootCard from "./LootCard";
import formatMoney from "../money";

export default function GameOver({
  gameState,
  lobbyId,
}: {
  gameState: RazziaGameState;
  lobbyId: string;
}) {
  const { user } = useUserContext();
  const [isCreating, setIsCreating] = useState(false);

  const results = useMemo(
    () => scoreGame(gameState.players, gameState.scoring || []),
    [gameState],
  );
  const winners = results.filter((p) => p.winner);
  const nextLobbyUID = gameState.nextLobbyUID;
  const roundCount = Math.max(0, ...results.map((p) => p.rounds.length));
  const columns = 3 + roundCount;

  const goToLobby = useCallback((uid: string) => {
    window.location.hash = `#${uid}`;
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, []);

  const handlePlayAgain = useCallback(async () => {
    setIsCreating(true);
    try {
      const lobby = await createLobby("razzia", { rematchOf: lobbyId });
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
              Three rounds of loot, then businesses and money at the end.
            </Text>
          </Stack>
        </Center>

        <Table.ScrollContainer minWidth={480}>
          <Table withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>#</Table.Th>
                <Table.Th>Player</Table.Th>
                {Array.from({ length: roundCount }, (_, i) => (
                  <Table.Th key={i}>
                    {i < 3 ? `Round ${i + 1}` : "Final"}
                  </Table.Th>
                ))}
                <Table.Th>Total</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {results.map((player) => {
                const state = gameState.players.find(
                  (p) => p.email === player.email,
                );
                return (
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
                      {Array.from({ length: roundCount }, (_, i) => {
                        const breakdown = player.breakdowns[i];
                        return (
                          <Table.Td key={i}>
                            {breakdown ? (
                              <span
                                title={Object.entries(breakdown.points)
                                  .map(([k, v]) => `${categoryLabel(k)}: ${v}`)
                                  .join(", ")}
                              >
                                {breakdown.total}
                              </span>
                            ) : (
                              "—"
                            )}
                          </Table.Td>
                        );
                      })}
                      <Table.Td>{player.score}</Table.Td>
                    </Table.Tr>
                    <Table.Tr>
                      <Table.Td colSpan={columns}>
                        <Group gap="md" wrap="wrap" align="flex-start" py={4}>
                          {player.breakdowns.map((breakdown, i) => (
                            <Text key={i} size="xs" c="dimmed">
                              {i < 3 ? `R${breakdown.round}` : "Final"}:{" "}
                              {Object.entries(breakdown.points)
                                .filter(([, v]) => v !== 0)
                                .map(
                                  ([k, v]) =>
                                    `${categoryLabel(k)} ${v > 0 ? "+" : ""}${v}`,
                                )
                                .join(", ") || "nothing"}
                            </Text>
                          ))}
                        </Group>
                        <Group gap="md" wrap="wrap" align="flex-start">
                          {CATEGORY_ORDER.filter(
                            (c) => (state?.cards?.[c] || []).length > 0,
                          ).map((category) => (
                            <div key={category}>
                              <Text size="xs" c="dimmed" mb={2}>
                                {CATEGORY_LABELS[category]}
                              </Text>
                              <Group gap={2} wrap="wrap">
                                {(state?.cards?.[category] || []).map(
                                  (card, index) => (
                                    <LootCard
                                      key={`${card}-${index}`}
                                      card={card}
                                      width={34}
                                    />
                                  ),
                                )}
                              </Group>
                            </div>
                          ))}
                          <div>
                            <Text size="xs" c="dimmed" mb={2}>
                              Money
                            </Text>
                            <Text size="sm">
                              {[...(state?.money || [])]
                                .sort((a, b) => Number(a) - Number(b))
                                .map(formatMoney)
                                .join(", ") || "—"}
                            </Text>
                          </div>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  </Fragment>
                );
              })}
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
