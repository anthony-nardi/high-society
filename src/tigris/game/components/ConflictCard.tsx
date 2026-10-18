import { useState } from "react";
import { Badge, Button, Group, Paper, Stack, Text } from "@mantine/core";
import { TigrisGameState } from "../types";
import displayName from "../../../shared/utils/displayName";
import { COLOUR_HEX, LEADER_NAME, POINT_NAME, TILE_NAME } from "../board";
import classes from "../tigris.module.css";

/** The conflict under way, or the last one fought, in a sentence or two. */
export default function ConflictCard({
  gameState,
  me,
}: {
  gameState: TigrisGameState;
  me?: string | null;
}) {
  const [dismissed, setDismissed] = useState<string | null>(null);
  const name = (email: string) => (email === me ? "You" : displayName(email));
  const live = gameState.conflict;
  const last = gameState.lastConflict;

  if (live) {
    const unit = live.kind === "REVOLT" ? "temple" : TILE_NAME[live.colour];
    const aCommit = live.attackerCommit;
    return (
      <Paper
        withBorder
        radius="md"
        p="sm"
        className={classes.conflictCard}
        aria-label="Conflict"
      >
        <Stack gap={4}>
          <Group gap={6} wrap="wrap">
            <Badge color="orange" variant="filled" radius="sm">
              {live.kind === "REVOLT" ? "Revolt" : "War"}
            </Badge>
            <Badge
              radius="sm"
              variant="filled"
              style={{ background: COLOUR_HEX[live.colour], color: "#fff" }}
            >
              {LEADER_NAME[live.colour]}s
            </Badge>
          </Group>
          <Text size="sm">
            <b>{name(live.attacker)}</b>{" "}
            {live.attacker === me ? "attack" : "attacks"}{" "}
            <b>{name(live.defender)}</b>.{" "}
            {live.kind === "REVOLT"
              ? "Temples beside each leader count, plus temples from hand."
              : `${TILE_NAME[live.colour]}s linked to each leader count, plus ${TILE_NAME[live.colour]}s from hand.`}
          </Text>
          <Group gap="md" justify="center" wrap="wrap">
            <Text size="sm">
              {name(live.attacker)}: <b>{live.attackerBase}</b>
              {aCommit !== undefined ? (
                <>
                  {" "}
                  + <b>{aCommit}</b> committed ={" "}
                  <b>{live.attackerBase + aCommit}</b>
                </>
              ) : (
                " on the board, deciding"
              )}
            </Text>
            <Text size="sm">
              {name(live.defender)}: <b>{live.defenderBase}</b>
              {live.stage === "DEFENDER"
                ? ` on the board, deciding`
                : " on the board"}
            </Text>
          </Group>
          <Text size="xs" c="dimmed">
            The defender wins ties. Committed {unit}s leave the game.
          </Text>
        </Stack>
      </Paper>
    );
  }

  if (!last) return null;
  const key = `${last.turn}:${last.colour}:${last.winner}:${last.loser}`;
  if (dismissed === key) return null;
  const aStrength = last.attackerBase + (last.attackerCommit || 0);
  const dStrength = last.defenderBase + (last.defenderCommit || 0);
  return (
    <Paper
      withBorder
      radius="md"
      p="sm"
      className={classes.conflictCard}
      aria-label="Last conflict"
    >
      <Stack gap={4}>
        <Group gap={6} justify="space-between" wrap="nowrap">
          <Group gap={6} wrap="wrap">
            <Badge color="gray" variant="light" radius="sm">
              Last {last.kind === "REVOLT" ? "revolt" : "war"}
            </Badge>
            <Badge
              radius="sm"
              variant="filled"
              style={{ background: COLOUR_HEX[last.colour], color: "#fff" }}
            >
              {LEADER_NAME[last.colour]}s
            </Badge>
          </Group>
          <Button
            size="compact-xs"
            variant="subtle"
            onClick={() => setDismissed(key)}
          >
            Hide
          </Button>
        </Group>
        <Text size="sm">
          <b>{name(last.winner)}</b> won{" "}
          {last.winner === last.attacker ? "the attack" : "the defence"}{" "}
          <b>{last.winner === last.attacker ? aStrength : dStrength}</b> to{" "}
          <b>{last.winner === last.attacker ? dStrength : aStrength}</b>
          {" ("}
          {name(last.attacker)} {last.attackerBase} + {last.attackerCommit || 0}{" "}
          from hand, {name(last.defender)} {last.defenderBase} +{" "}
          {last.defenderCommit || 0}
          {"). "}
          {name(last.loser)} withdrew the {LEADER_NAME[last.colour]}
          {last.removed
            ? ` and lost ${last.removed} ${TILE_NAME[last.colour]}${last.removed === 1 ? "" : "s"}`
            : ""}
          ; {name(last.winner)} gained <b>{last.gained}</b>{" "}
          {POINT_NAME[last.colour]}
          {last.gained === 1 ? "" : "s"}.
        </Text>
      </Stack>
    </Paper>
  );
}
