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
import { AcquireGameState, Chain } from "../types";
import displayName from "../../../shared/utils/displayName";
import createLobby from "../../../high-society/client/createLobby";
import { useUserContext } from "../../../shared/context/useUserContext";
import GameLog from "../../../shared/components/GameLog";
import GameOverReveal from "../../../shared/components/GameOverReveal";
import {
  activeChains,
  bonusLevels,
  CHAIN_COLOUR,
  currentPrice,
  label,
  modeLabel,
  money,
} from "../board";

function ChainChip({ chain }: { chain: Chain }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontWeight: 700,
      }}
    >
      <span
        style={{
          width: 12,
          height: 12,
          borderRadius: 3,
          background: CHAIN_COLOUR[chain],
          border: "1px solid rgba(0,0,0,0.5)",
          flex: "0 0 auto",
        }}
      />
      {label(chain)}
    </span>
  );
}

/** What a bonus amount was, read back from the info card. */
function rankOf(amount: number, price: number, mode: AcquireGameState["mode"]) {
  const levels = bonusLevels(price, mode);
  if (amount === levels.primary + (levels.tertiary ?? levels.secondary))
    return "sole holder";
  if (amount === levels.primary) return "primary";
  if (amount === levels.secondary) return "secondary";
  if (levels.tertiary !== undefined && amount === levels.tertiary)
    return "tertiary";
  return "tied, split";
}

export default function GameOver({
  gameState,
  lobbyId,
}: {
  gameState: AcquireGameState;
  lobbyId: string;
}) {
  const { user } = useUserContext();
  const [isCreating, setIsCreating] = useState(false);
  const winner = gameState.players.find((p) => p.email === gameState.winner);
  const nextLobbyUID = gameState.nextLobbyUID;
  const scores = gameState.scores || [];
  const scoreOf = (email: string) => scores.find((s) => s.email === email);
  const ranked = [...gameState.players].sort((a, b) => b.money - a.money);
  const detailed = scores.some((s) => s.cashBefore !== undefined);
  const chains = activeChains(gameState);
  const sum = (xs: number[]) => xs.reduce((n, x) => n + x, 0);

  const goToLobby = useCallback((uid: string) => {
    window.location.hash = `#${uid}`;
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, []);

  const handlePlayAgain = useCallback(async () => {
    setIsCreating(true);
    try {
      const lobby = await createLobby("acquire", { rematchOf: lobbyId });
      goToLobby(String(lobby.data.lobbyUID));
    } finally {
      setIsCreating(false);
    }
  }, [lobbyId, goToLobby]);

  return (
    <GameOverReveal celebrate={!!user && gameState.winner === user.email}>
      <Container size="sm" px="md" py="xl">
        <Stack gap="lg">
          <Center>
            <Stack gap={4} align="center">
              <Title order={1}>Game over</Title>
              <Title order={3} c="yellow.4" className="reveal-title">
                {winner
                  ? `${displayName(winner.email)} wins with ${money(winner.money)}!`
                  : "A shared win"}
              </Title>
              {gameState.notification?.message && (
                <Text size="sm" c="dimmed" ta="center">
                  {gameState.notification.message}
                </Text>
              )}
              <Badge variant="light" color="gray" radius="sm">
                {modeLabel(gameState.mode)} Mode
              </Badge>
            </Stack>
          </Center>

          <Table withTableBorder fz="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Player</Table.Th>
                {detailed && <Table.Th ta="right">Cash at the end</Table.Th>}
                {detailed && <Table.Th ta="right">Bonuses</Table.Th>}
                {detailed && <Table.Th ta="right">Shares sold</Table.Th>}
                <Table.Th ta="right">Final</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {ranked.map((player) => {
                const score = scoreOf(player.email);
                const bonuses = sum(
                  (score?.bonuses || []).map((b) => b.amount),
                );
                const sales = sum((score?.sales || []).map((s) => s.amount));
                return (
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
                    {detailed && (
                      <Table.Td ta="right">
                        {money(score?.cashBefore ?? 0)}
                      </Table.Td>
                    )}
                    {detailed && (
                      <Table.Td ta="right">
                        {bonuses ? `+${money(bonuses)}` : "–"}
                      </Table.Td>
                    )}
                    {detailed && (
                      <Table.Td ta="right">
                        {sales ? `+${money(sales)}` : "–"}
                      </Table.Td>
                    )}
                    <Table.Td ta="right">{money(player.money)}</Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>

          {detailed && chains.length > 0 && (
            <Stack gap="sm">
              <Title order={4}>How the final payout was worked out</Title>
              <Text size="sm" c="dimmed">
                Every chain on the board paid its stockholder bonuses as if it
                had been swallowed, then every share was sold back at the
                closing price. Shares in chains not on the board were worth
                nothing.
              </Text>
              {chains.map((chain) => {
                const price = currentPrice(gameState, chain);
                const levels = bonusLevels(price, gameState.mode);
                const paid = scores.flatMap((s) =>
                  (s.bonuses || [])
                    .filter((b) => b.chain === chain)
                    .map((b) => ({ email: s.email, amount: b.amount })),
                );
                const sold = scores.flatMap((s) =>
                  (s.sales || [])
                    .filter((x) => x.chain === chain)
                    .map((x) => ({ email: s.email, ...x })),
                );
                return (
                  <Stack
                    key={chain}
                    gap={4}
                    p="sm"
                    style={{
                      borderRadius: 10,
                      background: "var(--mantine-color-default)",
                      borderLeft: `6px solid ${CHAIN_COLOUR[chain]}`,
                    }}
                  >
                    <Group justify="space-between" wrap="wrap" gap="xs">
                      <ChainChip chain={chain} />
                      <Text size="xs" c="dimmed">
                        {gameState.chains[chain].size} tiles · {money(price)} a
                        share · bonuses {money(levels.primary)} /{" "}
                        {money(levels.secondary)}
                        {levels.tertiary !== undefined
                          ? ` / ${money(levels.tertiary)}`
                          : ""}
                      </Text>
                    </Group>
                    {paid.length === 0 ? (
                      <Text size="sm" c="dimmed">
                        Nobody held any shares, so no bonuses.
                      </Text>
                    ) : (
                      paid.map((p) => (
                        <Text key={`b-${p.email}`} size="sm">
                          {displayName(p.email)}:{" "}
                          {rankOf(p.amount, price, gameState.mode)} bonus{" "}
                          <b>+{money(p.amount)}</b>
                        </Text>
                      ))
                    )}
                    {sold.map((s) => (
                      <Text key={`s-${s.email}`} size="sm" c="dimmed">
                        {displayName(s.email)} sold {s.shares} share
                        {s.shares === 1 ? "" : "s"} at {money(s.price)}:{" "}
                        <b>+{money(s.amount)}</b>
                      </Text>
                    ))}
                  </Stack>
                );
              })}
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
