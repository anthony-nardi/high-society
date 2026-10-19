import { Badge, Box, Group, Text } from "@mantine/core";
import type { PushGameState, PushPlayerState } from "../types";
import displayName, { isBotName } from "../../../shared/utils/displayName";
import ThinkingDots from "../../../shared/components/ThinkingDots";
import CardFace from "./CardFace";
import {
  cardCount,
  COLOUR_INFO,
  groupByColour,
  points,
  scoreOf,
} from "../board";
import classes from "../push.module.css";

export default function PlayerOverview({
  player,
  gameState,
  me,
}: {
  player: PushPlayerState;
  gameState: PushGameState;
  me?: string | null;
}) {
  const isCurrentUser = player.email === me;
  const isBot = isBotName(player.email);
  const active = player.email === gameState.activePlayer;
  const pusher = player.email === gameState.turnPlayer;
  const bench = groupByColour(player.bench || []);
  const bank = groupByColour(player.bank || []);
  const roll = gameState.lastRoll;
  const lostNow =
    roll && roll.email === player.email && roll.turn === gameState.turn
      ? roll.lost || []
      : [];
  const bankedNow =
    gameState.lastBank &&
    gameState.lastBank.email === player.email &&
    gameState.lastBank.turn === gameState.turn
      ? gameState.lastBank.colour
      : null;

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
            pusher ? (
              "Your turn"
            ) : (
              "You choose"
            )
          ) : isBot ? (
            <>
              Thinking
              <ThinkingDots />
            </>
          ) : pusher ? (
            "Their turn"
          ) : (
            "Choosing"
          )}
        </Badge>
      )}
      {lostNow.length > 0 && (
        <span
          className="money-float"
          style={{ color: "var(--mantine-color-red-4)" }}
          key={`lost-${roll?.turn}`}
        >
          −{points(lostNow)}
        </span>
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
        <Badge
          variant="filled"
          color="dark"
          radius="sm"
          size="lg"
          aria-label={`${displayName(player.email)} has ${scoreOf(player)} points from ${cardCount(player)} cards`}
        >
          {scoreOf(player)} pts
        </Badge>
      </Group>

      <div
        className={classes.zone}
        aria-label={`${displayName(player.email)}'s zone: ${points(player.bench || [])} points at risk`}
      >
        {bench.map((g) => (
          <div key={g.colour} className={classes.group}>
            {g.cards.map((card, i) => (
              <div
                key={`${card}-${i}`}
                className={lostNow.includes(card) ? classes.lost : undefined}
              >
                <CardFace card={card} width={30} decorative />
              </div>
            ))}
            <span
              className={classes.groupTotal}
              style={{
                background: COLOUR_INFO[g.colour].colour,
                color: COLOUR_INFO[g.colour].ink,
              }}
            >
              {points(g.cards)}
            </span>
          </div>
        ))}
        {!bench.length && (
          <Text size="xs" c="dimmed">
            nothing in the zone
          </Text>
        )}
      </div>
      {bank.length > 0 && (
        <div
          className={classes.zone}
          aria-label={`${displayName(player.email)}'s protected cards: ${points(player.bank || [])} points safe`}
          style={{ marginTop: 0 }}
        >
          <Text size="xs" c="dimmed" style={{ alignSelf: "center" }}>
            🔒
          </Text>
          {bank.map((g) => (
            <div
              key={g.colour}
              className={`${classes.group} ${bankedNow === g.colour ? classes.banked : ""}`}
            >
              {g.cards.map((card, i) => (
                <CardFace
                  key={`${card}-${i}`}
                  card={card}
                  width={30}
                  down
                  decorative
                />
              ))}
              <span
                className={classes.groupTotal}
                style={{
                  background: COLOUR_INFO[g.colour].colour,
                  color: COLOUR_INFO[g.colour].ink,
                }}
              >
                {points(g.cards)}
              </span>
            </div>
          ))}
        </div>
      )}
      <Text size="xs" c="dimmed">
        {points(player.bench || [])} at risk · {points(player.bank || [])} safe
        · {cardCount(player)} cards
      </Text>
    </Box>
  );
}
