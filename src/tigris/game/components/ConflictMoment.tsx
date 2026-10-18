import { useState } from "react";
import { Badge, Button, Group, Paper, Stack, Text } from "@mantine/core";
import { Colour, Dynasty, TigrisGameState } from "../types";
import displayName from "../../../shared/utils/displayName";
import {
  COLOUR_HEX,
  DYNASTY_SYMBOL,
  LEADER_NAME,
  POINT_NAME,
  TILE_NAME,
} from "../board";

function Token({
  colour,
  dynasty,
  size = 44,
}: {
  colour: Colour;
  dynasty: Dynasty;
  size?: number;
}) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#fbf3e2",
        border: `5px solid ${COLOUR_HEX[colour]}`,
        fontSize: size * 0.45,
        boxShadow: "0 3px 6px rgba(0,0,0,0.4)",
      }}
    >
      {DYNASTY_SYMBOL[dynasty]}
    </span>
  );
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * The conflict, told in beats: who faces whom, what each side brings,
 * what is at stake. Stays as a recap once it is fought, until hidden.
 */
export default function ConflictMoment({
  gameState,
  me,
}: {
  gameState: TigrisGameState;
  me?: string | null;
}) {
  const [dismissed, setDismissed] = useState<string | null>(null);
  const name = (email: string) => (email === me ? "You" : displayName(email));
  const dynasty = (email: string) =>
    gameState.players.find((p) => p.email === email)?.dynasty ?? "ARCHER";
  const live = gameState.conflict;
  const last = gameState.lastConflict;

  if (live) {
    const kind = live.kind === "REVOLT" ? "Revolt" : "War";
    const unit = live.kind === "REVOLT" ? "temple" : TILE_NAME[live.colour];
    const aCommit = live.attackerCommit;
    const aTotal = live.attackerBase + (aCommit ?? 0);
    const deciding = live.stage === "ATTACKER" ? live.attacker : live.defender;
    const stakes =
      live.kind === "WAR"
        ? `If ${name(live.defender)} ${live.defender === me ? "lose" : "loses"}: the ${LEADER_NAME[live.colour]} and ${plural(live.defenderBase, TILE_NAME[live.colour])} go, and ${name(live.attacker)} ${live.attacker === me ? "gain" : "gains"} ${plural(live.defenderBase + 1, POINT_NAME[live.colour])}. If ${name(live.attacker)} ${live.attacker === me ? "lose" : "loses"}: the ${LEADER_NAME[live.colour]} and ${plural(live.attackerBase, TILE_NAME[live.colour])} go, ${name(live.defender)} ${live.defender === me ? "gain" : "gains"} ${plural(live.attackerBase + 1, POINT_NAME[live.colour])}.`
        : `The loser's ${LEADER_NAME[live.colour]} leaves the board and the winner gains an amulet. Committed temples leave the game.`;
    const key = `${live.kind}:${live.colour}:${live.attackerCell}:${live.defenderCell}`;
    return (
      <Paper
        key={key}
        withBorder
        radius="md"
        p="sm"
        className="merger-card"
        aria-label="Conflict"
        aria-live="polite"
      >
        <Stack gap={8} align="center">
          <Group gap={6} justify="center" wrap="wrap">
            <Badge color="orange" variant="filled" radius="sm" size="lg">
              {kind}
            </Badge>
            <Badge
              radius="sm"
              variant="filled"
              size="lg"
              style={{ background: COLOUR_HEX[live.colour], color: "#fff" }}
            >
              {LEADER_NAME[live.colour]} against {LEADER_NAME[live.colour]}
            </Badge>
          </Group>

          {/* 1. The two leaders face off. */}
          <Group
            gap={14}
            justify="center"
            wrap="nowrap"
            className="merger-step merger-step-1"
          >
            <Stack gap={2} align="center">
              <Token colour={live.colour} dynasty={dynasty(live.attacker)} />
              <Text size="xs" fw={700}>
                {name(live.attacker)}
              </Text>
              <Text size="xs" c="dimmed">
                attacks
              </Text>
            </Stack>
            <span className="merger-arrow" aria-hidden="true">
              ⚔
            </span>
            <Stack gap={2} align="center">
              <Token colour={live.colour} dynasty={dynasty(live.defender)} />
              <Text size="xs" fw={700}>
                {name(live.defender)}
              </Text>
              <Text size="xs" c="dimmed">
                defends
              </Text>
            </Stack>
          </Group>
          <Text size="sm" ta="center" className="merger-step merger-step-1">
            {live.kind === "REVOLT"
              ? "Temples beside each leader count, plus temples committed from hand."
              : `${TILE_NAME[live.colour]}s linked to each leader on its side of the uniting tile count, plus ${TILE_NAME[live.colour]}s committed from hand.`}
          </Text>

          {/* 2. Strength, side by side. */}
          <Stack
            gap={2}
            style={{ width: "100%", maxWidth: 360 }}
            className="merger-step merger-step-2"
          >
            <Group
              justify="space-between"
              wrap="nowrap"
              className="merger-row"
              style={{ animationDelay: "900ms" }}
            >
              <Text size="sm" fw={live.attacker === me ? 800 : 500}>
                {name(live.attacker)}
              </Text>
              <Text size="sm" style={{ whiteSpace: "nowrap" }}>
                {live.attackerBase} on the board
                {aCommit !== undefined ? (
                  <>
                    {" "}
                    + {aCommit} from hand = <b>{aTotal}</b>
                  </>
                ) : (
                  <Text component="span" c="dimmed">
                    {" "}
                    + ? from hand
                  </Text>
                )}
              </Text>
            </Group>
            <Group
              justify="space-between"
              wrap="nowrap"
              className="merger-row"
              style={{ animationDelay: "1150ms" }}
            >
              <Text size="sm" fw={live.defender === me ? 800 : 500}>
                {name(live.defender)}
              </Text>
              <Text size="sm" style={{ whiteSpace: "nowrap" }}>
                {live.defenderBase} on the board
                <Text component="span" c="dimmed">
                  {" "}
                  + ? from hand
                </Text>
              </Text>
            </Group>
          </Stack>

          {/* 3. What hangs on it. */}
          <Text
            size="xs"
            c="dimmed"
            ta="center"
            className="merger-step merger-step-3"
          >
            {stakes} The defender wins ties.
          </Text>
          <Text size="xs" ta="center" className="merger-step merger-step-3">
            Deciding now: <b>{name(deciding)}</b>
            {deciding !== me ? `, how many ${unit}s to commit.` : "."}
          </Text>
        </Stack>
      </Paper>
    );
  }

  if (!last) return null;
  const key = `${last.turn}:${last.colour}:${last.winner}:${last.loser}:${last.loserCell}`;
  if (dismissed === key) return null;
  const aStrength = last.attackerBase + (last.attackerCommit || 0);
  const dStrength = last.defenderBase + (last.defenderCommit || 0);
  const winnerStrength = last.winner === last.attacker ? aStrength : dStrength;
  const loserStrength = last.winner === last.attacker ? dStrength : aStrength;
  return (
    <Paper
      key={key}
      withBorder
      radius="md"
      p="sm"
      className="merger-card"
      aria-label="Last conflict"
    >
      <Stack gap={6}>
        <Group gap={6} justify="space-between" wrap="nowrap">
          <Group gap={6} wrap="wrap">
            <Badge color="gray" variant="light" radius="sm">
              {last.kind === "REVOLT" ? "Revolt" : "War"} fought
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
        <Group
          gap={10}
          justify="center"
          wrap="nowrap"
          className="merger-step merger-step-1"
        >
          <Stack gap={0} align="center">
            <Token
              colour={last.colour}
              dynasty={dynasty(last.winner)}
              size={38}
            />
            <Text size="xs" fw={700} c="green.4">
              {name(last.winner)} · {winnerStrength}
            </Text>
          </Stack>
          <Text size="xs" c="dimmed">
            beat
          </Text>
          <Stack gap={0} align="center" style={{ opacity: 0.55 }}>
            <Token
              colour={last.colour}
              dynasty={dynasty(last.loser)}
              size={38}
            />
            <Text size="xs" fw={700}>
              {name(last.loser)} · {loserStrength}
            </Text>
          </Stack>
        </Group>
        <Text size="sm" ta="center" className="merger-step merger-step-2">
          {name(last.attacker)} brought {last.attackerBase} +{" "}
          {last.attackerCommit || 0} from hand, {name(last.defender)}{" "}
          {last.defenderBase} + {last.defenderCommit || 0}. {name(last.loser)}{" "}
          {last.loser === me ? "withdraw" : "withdraws"} the{" "}
          {LEADER_NAME[last.colour]}
          {last.removed
            ? ` and ${last.loser === me ? "lose" : "loses"} ${plural(last.removed, TILE_NAME[last.colour])}`
            : ""}
          ; {name(last.winner)} {last.winner === me ? "gain" : "gains"}{" "}
          <b>{plural(last.gained, POINT_NAME[last.colour])}</b>.
        </Text>
      </Stack>
    </Paper>
  );
}
