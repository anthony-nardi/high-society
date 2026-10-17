import { useEffect, useRef, useState } from "react";
import { Badge, Box, Group, Text } from "@mantine/core";
import { RideTheRailsGameState, RideTheRailsPlayerState } from "../types";
import { useUserContext } from "../../../shared/context/useUserContext";
import displayName, { isBotName } from "../../../shared/utils/displayName";
import ThinkingDots from "../../../shared/components/ThinkingDots";
import { COLOURS, hasActed, label, RAILROADS, sharesOf } from "../board";
import classes from "../rails.module.css";

export default function PlayerOverview({
  player,
  gameState,
}: {
  player: RideTheRailsPlayerState;
  gameState: RideTheRailsGameState;
}) {
  const { user } = useUserContext();
  const isActivePlayer = player.email === gameState.activePlayer;
  const isCurrentUser = !!user && player.email === user.email;
  const isBot = isBotName(player.email);
  const seat = gameState.order.indexOf(player.email);
  const held = RAILROADS.filter((r) => sharesOf(player, r) > 0);
  const done = !isActivePlayer && hasActed(gameState, player.email);

  // Money that just arrived floats up off the card.
  const lastMoney = useRef(player.money);
  const [gain, setGain] = useState<{ amount: number; key: number } | null>(
    null,
  );
  useEffect(() => {
    const delta = player.money - lastMoney.current;
    lastMoney.current = player.money;
    if (delta > 0) {
      setGain({ amount: delta, key: Date.now() });
      const timer = window.setTimeout(() => setGain(null), 1700);
      return () => window.clearTimeout(timer);
    }
  }, [player.money]);

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
        opacity: done ? 0.6 : 1,
        transition: "border-color 200ms, box-shadow 200ms, opacity 200ms",
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
            "Your turn"
          ) : isBot ? (
            <>
              Thinking
              <ThinkingDots />
            </>
          ) : (
            "Their turn"
          )}
        </Badge>
      )}
      {gain && (
        <span key={gain.key} className={classes.floatUp} aria-hidden="true">
          +${gain.amount}
        </span>
      )}
      <Group
        justify="space-between"
        align="center"
        wrap="nowrap"
        gap="xs"
        mt={4}
      >
        <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
          <Badge size="xs" color="gray" variant="light" radius="sm">
            {seat + 1}
          </Badge>
          <Text fw={700} truncate>
            {displayName(player.email)}
            {isCurrentUser && (
              <Text component="span" c="dimmed" fw={400}>
                {" "}
                (you)
              </Text>
            )}
          </Text>
          {done && (
            <Badge size="xs" color="gray" variant="light" radius="sm">
              done
            </Badge>
          )}
        </Group>
        <Text fw={700} c="yellow.4" aria-label={`$${player.money}`}>
          ${player.money}
        </Text>
      </Group>
      <Group gap={4} mt={4} wrap="wrap" aria-label="Shares">
        {held.length === 0 && (
          <Text size="xs" c="dimmed">
            No shares yet
          </Text>
        )}
        {held.map((r) => (
          <span
            key={r}
            title={`${sharesOf(player, r)} ${label(r)}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              padding: "1px 6px",
              borderRadius: 6,
              background: COLOURS[r],
              color: r === "YELLOW" ? "#222" : "#fff",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {sharesOf(player, r)}
          </span>
        ))}
      </Group>
    </Box>
  );
}
