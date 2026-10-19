import { Badge, Box, Group, Text } from "@mantine/core";
import type { MediciGameState, MediciPlayerState } from "../types";
import displayName, { isBotName } from "../../../shared/utils/displayName";
import ThinkingDots from "../../../shared/components/ThinkingDots";
import CardFace, { EmptySlot } from "./CardFace";
import {
  COMMODITIES,
  COMMODITY_INFO,
  countOf,
  freeSpace,
  isFull,
  seatColour,
  shipValue,
  sortedShip,
  TOP_LEVEL,
} from "../board";
import classes from "../medici.module.css";

export default function PlayerOverview({
  player,
  gameState,
  me,
}: {
  player: MediciPlayerState;
  gameState: MediciGameState;
  me?: string | null;
}) {
  const isCurrentUser = player.email === me;
  const isBot = isBotName(player.email);
  const active = player.email === gameState.activePlayer;
  const ship = player.ship || [];
  const full = isFull(gameState, player);
  const free = freeSpace(gameState, player);
  const auctioneer = player.email === gameState.auctioneer;
  const bidding = gameState.phase === "BID";
  const last = gameState.lastAuction;
  const justBought =
    last && last.email === player.email && last.turn === gameState.turn - 1;
  const scored =
    gameState.dayScoring &&
    gameState.dayScoring.turn === gameState.turn &&
    !gameState.lot
      ? gameState.dayScoring.totals.find((t) => t.email === player.email)
      : undefined;
  const colour = seatColour(gameState, player.email);

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
            bidding ? (
              "Your bid"
            ) : (
              "Your lot"
            )
          ) : isBot ? (
            <>
              Thinking
              <ThinkingDots />
            </>
          ) : bidding ? (
            "Their bid"
          ) : (
            "Their lot"
          )}
        </Badge>
      )}
      {scored && scored.after !== scored.before && (
        <span className="money-float" key={`float-${gameState.day}`}>
          +{scored.after - scored.before}
        </span>
      )}
      {justBought && last?.amount && (
        <span
          className={`money-float ${classes.spent}`}
          key={`spent-${last.turn}`}
        >
          −{last.amount}
        </span>
      )}
      <Group justify="space-between" align="center" wrap="nowrap" gap={6}>
        <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
          <span
            className={classes.seat}
            style={{ background: colour }}
            aria-hidden="true"
          />
          <Text fw={700} truncate style={{ minWidth: 0 }}>
            {displayName(player.email)}
            {isCurrentUser && (
              <Text component="span" c="dimmed" fw={400}>
                {" "}
                (you)
              </Text>
            )}
          </Text>
          {auctioneer && gameState.status === "IN_PROGRESS" && (
            <Badge
              variant="light"
              color="yellow"
              radius="sm"
              size="sm"
              title="Holds the first player card: makes up the lot and bids last"
            >
              ★ first
            </Badge>
          )}
        </Group>
        <Badge
          variant="filled"
          color="dark"
          radius="sm"
          size="lg"
          aria-label={`${displayName(player.email)} has ${player.money} florins`}
          className={scored || justBought ? "chip-pop" : undefined}
          key={`money-${player.money}`}
        >
          {player.money} ƒ
        </Badge>
      </Group>

      <div
        className={classes.hold}
        aria-label={`${displayName(player.email)}'s hold: ${ship.length} of ${gameState.capacity}, value ${shipValue(ship)}`}
      >
        {sortedShip(ship).map((card, i) => (
          <div
            key={`${card}-${i}`}
            className={
              justBought && last?.lot.includes(card)
                ? classes.loaded
                : undefined
            }
          >
            <CardFace card={card} width={34} decorative />
          </div>
        ))}
        {Array.from({ length: free }, (_, i) => (
          <EmptySlot key={`empty-${i}`} width={34} />
        ))}
      </div>
      <Group gap={6} justify="space-between" wrap="wrap">
        <Text size="xs" c="dimmed">
          Cargo {shipValue(ship)}
          {full ? " · full" : ` · ${free} free`}
        </Text>
        {bidding && gameState.status === "IN_PROGRESS" && (
          <Badge
            variant={player.email === gameState.highBidder ? "filled" : "light"}
            color={
              player.email === gameState.highBidder
                ? "yellow"
                : player.passed
                  ? "gray"
                  : "blue"
            }
            radius="sm"
            size="sm"
          >
            {player.bid !== undefined
              ? `bid ${player.bid}`
              : player.passed
                ? full
                  ? "out for the day"
                  : "passes"
                : active
                  ? "to bid"
                  : "waiting"}
          </Badge>
        )}
        {!bidding && full && gameState.status === "IN_PROGRESS" && (
          <Badge variant="light" color="gray" radius="sm" size="sm">
            out for the day
          </Badge>
        )}
      </Group>
      <Group gap={4} wrap="wrap" aria-label="Track levels">
        {COMMODITIES.map((c) => {
          const now = Math.min(TOP_LEVEL, player.tracks[c] + countOf(ship, c));
          return (
            <span
              key={c}
              className={classes.level}
              style={{
                background: COMMODITY_INFO[c].colour,
                color: COMMODITY_INFO[c].ink,
              }}
              title={`${c.toLowerCase()}: level ${now}${now !== player.tracks[c] ? ` tonight (${player.tracks[c]} now)` : ""}`}
            >
              {COMMODITY_INFO[c].emblem} {now}
            </span>
          );
        })}
      </Group>
    </Box>
  );
}
