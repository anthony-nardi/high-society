import { Badge, Box, Group, Text } from "@mantine/core";
import { FujiFlushGameState, FujiFlushPlayerState } from "../types";
import displayName, { isBotName } from "../../../shared/utils/displayName";
import ThinkingDots from "../../../shared/components/ThinkingDots";
import CardFace, { CardBack } from "./CardFace";
import { countOnTable, tableValue } from "../board";
import classes from "../fuji.module.css";

export default function PlayerOverview({
  player,
  gameState,
  me,
}: {
  player: FujiFlushPlayerState;
  gameState: FujiFlushGameState;
  me?: string | null;
}) {
  const isCurrentUser = player.email === me;
  const isBot = isBotName(player.email);
  const active = player.email === gameState.activePlayer;
  const hand = (player.hand || []).length;
  const played = player.played;
  const justPlayed =
    played !== undefined && player.playedOn === gameState.turn - 1;
  const teamSize =
    played === undefined ? 0 : countOnTable(gameState.players, played);
  const value =
    played === undefined ? 0 : tableValue(gameState.players, played);
  const joinedNow =
    teamSize > 1 &&
    gameState.lastPlay?.card === played &&
    gameState.lastPlay?.turn === gameState.turn - 1;
  const flushedNow =
    played === undefined
      ? gameState.lastPlay?.flushed?.find((f) => f.email === player.email)
      : undefined;
  const pushedNow =
    played === undefined &&
    gameState.lastPush &&
    gameState.lastPush.members.includes(player.email)
      ? gameState.lastPush
      : undefined;
  const lastCard = hand === 0 && played !== undefined;

  return (
    <Box
      p="sm"
      data-testid="player-overview"
      style={{
        position: "relative",
        borderRadius: 12,
        border: active
          ? "2px solid var(--mantine-color-yellow-5)"
          : "2px solid transparent",
        boxShadow: active ? "0 0 14px rgba(255, 216, 107, 0.45)" : undefined,
        background: active
          ? "rgba(255, 216, 107, 0.06)"
          : "var(--mantine-color-default)",
        transition: "border-color 200ms, box-shadow 200ms",
        minWidth: 0,
      }}
    >
      {active && gameState.status === "IN_PROGRESS" && (
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
      <Group justify="space-between" align="center" wrap="nowrap" gap={6}>
        <Text fw={700} truncate style={{ minWidth: 0 }}>
          {displayName(player.email)}
          {isCurrentUser && (
            <Text component="span" c="dimmed" fw={400}>
              {" "}
              (you)
            </Text>
          )}
        </Text>
        <Group
          gap={4}
          wrap="nowrap"
          aria-label={`${displayName(player.email)} holds ${hand} card${hand === 1 ? "" : "s"}`}
        >
          <span className={classes.backs} aria-hidden="true">
            {Array.from({ length: Math.min(hand, 8) }, (_, i) => (
              <CardBack key={i} width={13} />
            ))}
          </span>
          <Text size="xs" c="dimmed" style={{ whiteSpace: "nowrap" }}>
            {hand}
          </Text>
        </Group>
      </Group>
      <div className={classes.slot}>
        {played !== undefined ? (
          <>
            <div
              key={`${player.playedOn}-${played}`}
              className={`${justPlayed ? classes.landed : ""} ${joinedNow ? classes.team : ""}`}
            >
              <CardFace card={played} width={58} />
            </div>
            {teamSize > 1 && (
              <Badge
                color="yellow"
                variant="light"
                radius="sm"
                size="sm"
                aria-label={`Worth ${value} with ${teamSize - 1} other ${played}${teamSize > 2 ? "s" : ""}`}
              >
                {value} together
              </Badge>
            )}
          </>
        ) : flushedNow ? (
          <div className={classes.ghost} key={`flush-${gameState.turn}`}>
            <div className={classes.flushOut}>
              <CardFace card={flushedNow.card} width={58} dimmed />
            </div>
          </div>
        ) : pushedNow ? (
          <div className={classes.ghost} key={`push-${pushedNow.turn}`}>
            <div className={classes.pushOut}>
              <CardFace card={pushedNow.card} width={58} />
            </div>
          </div>
        ) : null}
        {played === undefined && (
          <Text size="xs" c="dimmed">
            {flushedNow
              ? "flushed"
              : pushedNow
                ? "pushed through"
                : hand === 0
                  ? "no cards"
                  : "no card down"}
          </Text>
        )}
      </div>
      <Group gap={6} justify="center" wrap="wrap">
        <Text size="xs" c="dimmed">
          {player.pushed} through · {player.flushed} flushed
        </Text>
        {lastCard && gameState.status === "IN_PROGRESS" && (
          <Badge color="red" variant="filled" radius="sm" size="sm">
            Last card
          </Badge>
        )}
      </Group>
    </Box>
  );
}
