import { Badge, Group, Stack, Text, Tooltip } from "@mantine/core";
import { Card, CondottiereGameState } from "../types";
import {
  CARD_HELP,
  CARD_LABEL,
  colourOf,
  isMercenary,
  strengthOf,
  REGIONS,
} from "../board";
import displayName, { isBotName } from "../../../shared/utils/displayName";
import ThinkingDots from "../../../shared/components/ThinkingDots";
import CardFace from "./CardFace";
import classes from "../condottiere.module.css";

/** A played card with its meaning a hover or a tap away. */
function Played({
  card,
  width,
  onClick,
  selected,
}: {
  card: Card;
  width: number;
  onClick?: () => void;
  selected?: boolean;
}) {
  return (
    <Tooltip
      label={`${CARD_LABEL[card]}: ${CARD_HELP[card]}`}
      withArrow
      multiline
      w={240}
      events={{ hover: true, focus: true, touch: true }}
    >
      <span style={{ display: "inline-block" }}>
        <CardFace
          card={card}
          width={width}
          onClick={onClick}
          selected={selected}
        />
      </span>
    </Tooltip>
  );
}

/** Snow for Winter, petals for Spring, drifting over the arena. */
function Weather({ season }: { season?: "WINTER" | "SPRING" }) {
  if (!season) return null;
  const n = 14;
  return (
    <div className={classes.weather} aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <span
          key={`${season}-${i}`}
          className={season === "WINTER" ? classes.flake : classes.petal}
          style={{
            left: `${(i * 37) % 100}%`,
            animationDuration: `${5 + ((i * 7) % 5)}s`,
            animationDelay: `${-((i * 1.3) % 6)}s`,
            fontSize: `${11 + ((i * 5) % 7)}px`,
          }}
        >
          {season === "WINTER" ? "❄" : i % 2 ? "❀" : "✿"}
        </span>
      ))}
    </div>
  );
}

/**
 * The battle, front and centre: every line with its strength, the leader
 * lit, cards dealt in as they land, and what a Bishop or a season took
 * away fading out where it stood.
 */
export default function BattleLines({
  gameState,
  me,
  pickingMercenary,
  onMercenary,
}: {
  gameState: CondottiereGameState;
  me?: string;
  /** A Scarecrow is in play: your mercenaries become targets. */
  pickingMercenary: boolean;
  onMercenary: (index: number) => void;
}) {
  const region = gameState.battlefield;
  const key = `${gameState.turn}:${region}`;
  const totals = gameState.players.map((p) => ({
    email: p.email,
    strength: strengthOf(p.line, gameState.season),
  }));
  const top = Math.max(0, ...totals.map((t) => t.strength));
  const leaders = totals.filter((t) => t.strength === top && top > 0);
  const leader = leaders.length === 1 ? leaders[0].email : undefined;
  const move = gameState.lastMove;
  const stamp = gameState.notification?.timestamp ?? 0;
  const active = gameState.activePlayer;
  const cardWidth = 62;

  return (
    <div className={classes.arena} data-testid="battle-lines">
      <Weather season={gameState.season} />
      <Stack gap={8} style={{ position: "relative" }}>
        <Group gap="xs" justify="center" wrap="wrap">
          <Badge color="red" variant="filled" radius="sm" size="lg">
            <span className={classes.swords} aria-hidden="true">
              ⚔
            </span>{" "}
            Battle {gameState.turn} ·{" "}
            {region !== undefined ? REGIONS[region].name : "…"}
          </Badge>
          {gameState.season && (
            <Badge
              color={gameState.season === "WINTER" ? "blue" : "green"}
              variant="filled"
              radius="sm"
              size="lg"
            >
              {gameState.season === "WINTER"
                ? "❄ Winter: every mercenary counts 1"
                : "❀ Spring: the strongest gain 3"}
            </Badge>
          )}
        </Group>

        {gameState.players.map((player) => {
          const line = player.line || [];
          const strength = strengthOf(line, gameState.season);
          const mine = player.email === me;
          const leading = player.email === leader;
          const removed = (move?.removed || []).filter(
            (r) => r.email === player.email,
          );
          const returned =
            move?.type === "play" &&
            move.card === "SCARECROW" &&
            move.email === player.email
              ? move.returned
              : undefined;
          return (
            <div
              key={player.email}
              className={`${classes.row} ${leading ? classes.rowLeading : ""} ${player.passed ? classes.rowPassed : ""} ${player.email === active ? classes.rowActive : ""}`}
            >
              <Stack gap={4} style={{ minWidth: 0 }}>
                <Group gap={4} wrap="nowrap">
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 3,
                      background: colourOf(gameState, player.email),
                      flex: "0 0 auto",
                    }}
                  />
                  <Text size="sm" fw={700} truncate>
                    {mine ? "You" : displayName(player.email)}
                  </Text>
                  {leading && (
                    <span className={classes.crown} aria-label="leading">
                      👑
                    </span>
                  )}
                </Group>
                <Group gap={6} wrap="nowrap" align="baseline">
                  <span
                    key={`${key}:${strength}`}
                    className={`${classes.strength} ${classes.pop}`}
                    style={{ color: leading ? "#ffd86b" : undefined }}
                    aria-label={`${displayName(player.email)} strength ${strength}`}
                  >
                    {strength}
                  </span>
                  {player.email === active && !player.passed && (
                    <Text size="xs" c="yellow.4">
                      {isBotName(player.email) ? (
                        <>
                          thinking
                          <ThinkingDots />
                        </>
                      ) : mine ? (
                        "your move"
                      ) : (
                        "to play"
                      )}
                    </Text>
                  )}
                </Group>
                <div className={classes.bar} aria-hidden="true">
                  <div
                    className={classes.barFill}
                    style={{
                      width: `${top ? Math.round((strength / top) * 100) : 0}%`,
                      background: leading
                        ? "#ffd86b"
                        : colourOf(gameState, player.email),
                    }}
                  />
                </div>
              </Stack>
              <div
                className={classes.cards}
                aria-label={`${displayName(player.email)}'s line`}
              >
                {line.length === 0 && removed.length === 0 && !returned ? (
                  <Text size="xs" c="dimmed">
                    {player.passed ? "sat out" : "nothing yet"}
                  </Text>
                ) : (
                  line.map((card: Card, i) => {
                    const target =
                      mine && pickingMercenary && isMercenary(card);
                    return (
                      <div
                        key={`${key}-${i}-${card}`}
                        className={`${classes.deal} ${target ? classes.target : ""}`}
                      >
                        <Played
                          card={card}
                          width={target ? cardWidth + 10 : cardWidth}
                          onClick={target ? () => onMercenary(i) : undefined}
                          selected={target}
                        />
                        {target && (
                          <Text size="xs" fw={700} c="yellow.4">
                            take back
                          </Text>
                        )}
                      </div>
                    );
                  })
                )}
                {removed.map((r, i) => (
                  <div
                    key={`gone-${stamp}-${i}`}
                    className={classes.ghost}
                    aria-label={`${CARD_LABEL[r.card]} discarded`}
                  >
                    <CardFace card={r.card} width={cardWidth} dimmed />
                  </div>
                ))}
                {returned && (
                  <div
                    key={`back-${stamp}`}
                    className={classes.returned}
                    aria-label={`${CARD_LABEL[returned]} taken back`}
                  >
                    <CardFace card={returned} width={cardWidth} dimmed />
                  </div>
                )}
              </div>
              {player.passed && (
                <span className={classes.stamp} aria-hidden="true">
                  PASSED
                </span>
              )}
            </div>
          );
        })}
        <Text size="xs" c="dimmed" ta="center">
          Highest line takes the region when everyone has passed. Hover or tap a
          card for what it does.
        </Text>
      </Stack>
    </div>
  );
}
