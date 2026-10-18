import { Badge, Group, Stack, Text } from "@mantine/core";
import { FujiFlushGameState } from "../types";
import { list, nameFor, tableValue } from "../board";
import classes from "../fuji.module.css";

/** The middle of the table: the stacks, what the last card did, and what is on top. */
export default function Table({
  gameState,
  me,
}: {
  gameState: FujiFlushGameState;
  me?: string | null;
}) {
  const name = (email: string) => nameFor(email, me);
  const play = gameState.lastPlay;
  const push = gameState.lastPush;
  const played = gameState.players.filter((p) => p.played !== undefined);
  const top = played.length
    ? Math.max(...played.map((p) => tableValue(played, p.played as number)))
    : 0;
  const onTop = played.filter(
    (p) => tableValue(played, p.played as number) === top,
  );

  return (
    <Stack gap={6} align="center">
      <Group gap="xs" justify="center">
        <Badge variant="light" radius="sm" size="lg">
          Turn {gameState.turn + 1}
        </Badge>
        <Badge variant="light" color="gray" radius="sm" size="lg">
          Stack {gameState.deckCount}
        </Badge>
        <Badge variant="light" color="gray" radius="sm" size="lg">
          Drain {gameState.discardCount}
        </Badge>
      </Group>
      {play && (
        <Text
          key={`play-${play.turn}`}
          size="sm"
          ta="center"
          className={classes.narrative}
          data-testid="last-play"
        >
          <b>{name(play.email)}</b> played a <b>{play.card}</b>
          {play.joined?.length
            ? ` with ${list(play.joined.map(name))} for ${play.value}`
            : ""}
          {play.flushed?.length ? (
            <>
              , flushing{" "}
              <Text component="span" c="red.4" fw={700}>
                {list(play.flushed.map((f) => `${name(f.email)}'s ${f.card}`))}
              </Text>
            </>
          ) : (
            ""
          )}
          .
        </Text>
      )}
      {push && (
        <Text
          key={`push-${push.turn}`}
          size="sm"
          ta="center"
          c="green.4"
          fw={600}
          className={classes.narrative}
          data-testid="last-push"
        >
          ✓ {name(push.email)} pushed a {push.card} through
          {push.members.length > 1
            ? ` with ${list(push.members.slice(1).map(name))}`
            : ""}
          .
        </Text>
      )}
      <Text size="xs" c="dimmed" ta="center">
        {played.length === 0
          ? "Nothing on the table."
          : `Top of the table: ${top} (${list(onTop.map((p) => name(p.email)))}${
              onTop.length > 1 ? ` with ${onTop[0].played}s` : ""
            }).`}
      </Text>
    </Stack>
  );
}
