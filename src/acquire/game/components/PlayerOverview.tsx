import { useEffect, useRef, useState } from "react";
import { Badge, Box, Group, Text } from "@mantine/core";
import { AcquireGameState, AcquirePlayerState, Chain } from "../types";
import { useUserContext } from "../../../shared/context/useUserContext";
import displayName, { isBotName } from "../../../shared/utils/displayName";
import ThinkingDots from "../../../shared/components/ThinkingDots";
import { CHAIN_COLOUR, CHAINS, label, money, stockOf } from "../board";

export default function PlayerOverview({
  player,
  gameState,
}: {
  player: AcquirePlayerState;
  gameState: AcquireGameState;
}) {
  const { user } = useUserContext();
  const isActivePlayer = player.email === gameState.activePlayer;
  const isTurnPlayer = player.email === gameState.turnPlayer;
  const isCurrentUser = !!user && player.email === user.email;
  const isBot = isBotName(player.email);
  const held = CHAINS.filter((c) => stockOf(player, c) > 0);

  // Shares that just grew pop, and money that just arrived floats up.
  const lastStocks = useRef<{ [chain in Chain]?: number }>({});
  const lastMoney = useRef(player.money);
  const [grown, setGrown] = useState<{ key: number; chains: Chain[] }>({
    key: 0,
    chains: [],
  });
  const [gain, setGain] = useState<{ amount: number; key: number } | null>(
    null,
  );
  useEffect(() => {
    const before = lastStocks.current;
    const chains = CHAINS.filter((c) => stockOf(player, c) > (before[c] ?? 0));
    lastStocks.current = Object.fromEntries(
      CHAINS.map((c) => [c, stockOf(player, c)]),
    );
    const delta = player.money - lastMoney.current;
    lastMoney.current = player.money;
    const timers: number[] = [];
    if (chains.length && Object.keys(before).length) {
      setGrown({ key: Date.now(), chains });
      timers.push(
        window.setTimeout(() => setGrown({ key: 0, chains: [] }), 1000),
      );
    }
    if (delta > 0) {
      setGain({ amount: delta, key: Date.now() });
      timers.push(window.setTimeout(() => setGain(null), 1700));
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [player]);

  return (
    <Box
      p="sm"
      data-testid="player-overview"
      style={{
        position: "relative",
        borderRadius: 12,
        border: isActivePlayer
          ? "2px solid var(--mantine-color-yellow-5)"
          : "2px solid transparent",
        boxShadow: isActivePlayer
          ? "0 0 14px rgba(255, 216, 107, 0.45)"
          : undefined,
        background: isActivePlayer
          ? "rgba(255, 216, 107, 0.06)"
          : "var(--mantine-color-default)",
        transition: "border-color 200ms, box-shadow 200ms",
        minWidth: 0,
      }}
    >
      {isActivePlayer && (
        <Badge
          color="yellow"
          variant="filled"
          radius="sm"
          style={{ position: "absolute", top: -10, left: 12 }}
        >
          {isCurrentUser ? (
            isTurnPlayer ? (
              "Your turn"
            ) : (
              "Your decision"
            )
          ) : isBot ? (
            <>
              Thinking
              <ThinkingDots />
            </>
          ) : isTurnPlayer ? (
            "Their turn"
          ) : (
            "Deciding"
          )}
        </Badge>
      )}
      {gain && (
        <span key={gain.key} className="money-float" aria-hidden="true">
          +{money(gain.amount)}
        </span>
      )}
      <Group justify="space-between" align="center" wrap="wrap" gap="xs" mt={4}>
        <Text fw={700} truncate>
          {displayName(player.email)}
          {isCurrentUser && (
            <Text component="span" c="dimmed" fw={400}>
              {" "}
              (you)
            </Text>
          )}
        </Text>
        {isCurrentUser ? (
          <Text
            size="sm"
            fw={600}
            aria-label={`${money(player.money)} in cash`}
          >
            {money(player.money)}
          </Text>
        ) : (
          <Text size="xs" c="dimmed">
            {(player.tiles || []).length} tiles
          </Text>
        )}
      </Group>
      <Group
        gap={4}
        mt={6}
        wrap="wrap"
        aria-label={`${displayName(player.email)}'s shares`}
      >
        {held.length === 0 ? (
          <Text size="xs" c="dimmed">
            No shares
          </Text>
        ) : (
          held.map((c) => (
            <Badge
              key={grown.chains.includes(c) ? `${c}-${grown.key}` : c}
              size="sm"
              radius="sm"
              variant="filled"
              className={grown.chains.includes(c) ? "chip-pop" : undefined}
              style={{ background: CHAIN_COLOUR[c], color: "#fff" }}
            >
              {stockOf(player, c)} {label(c)}
            </Badge>
          ))
        )}
      </Group>
    </Box>
  );
}
