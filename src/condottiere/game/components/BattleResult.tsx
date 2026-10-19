import { useState } from "react";
import { Badge, Button, Group, Stack, Text } from "@mantine/core";
import { CondottiereGameState } from "../types";
import displayName from "../../../shared/utils/displayName";
import { colourOf, REGIONS } from "../board";
import CardFace from "./CardFace";
import classes from "../condottiere.module.css";

/** How the last battle ended, with every line as it stood, until the next is called. */
export default function BattleResult({
  gameState,
  me,
}: {
  gameState: CondottiereGameState;
  me?: string;
}) {
  const [dismissed, setDismissed] = useState<string | null>(null);
  const last = gameState.lastBattle;
  if (!last) return null;
  const key = `${last.region}:${gameState.turn}`;
  if (dismissed === key) return null;
  const name = (email: string) => (email === me ? "You" : displayName(email));
  const top = Math.max(0, ...last.totals.map((t) => t.strength));
  const lines = last.lines || [];
  return (
    <div className={classes.arena} aria-label="Last battle">
      <Stack gap={8}>
        <Group justify="space-between" wrap="nowrap">
          <Group gap={6} wrap="wrap">
            <Badge color="gray" variant="light" radius="sm">
              Last battle · {REGIONS[last.region].name}
            </Badge>
            {last.winner ? (
              <Badge
                radius="sm"
                variant="filled"
                style={{
                  background: colourOf(gameState, last.winner),
                  color: "#fff",
                }}
              >
                {name(last.winner)} {last.winner === me ? "take" : "takes"} it
                with {top}
              </Badge>
            ) : (
              <Badge color="gray" radius="sm" variant="filled">
                {top > 0
                  ? `A draw at ${top}: nobody takes it`
                  : "Nobody fought"}
              </Badge>
            )}
          </Group>
          <Button
            size="compact-xs"
            variant="subtle"
            onClick={() => setDismissed(key)}
          >
            Hide
          </Button>
        </Group>
        {last.totals.map((t) => {
          const line = lines.find((l) => l.email === t.email)?.line || [];
          const won = t.email === last.winner;
          return (
            <Group key={t.email} gap={8} wrap="nowrap" align="center">
              <Group
                gap={4}
                wrap="nowrap"
                style={{ width: 104, flex: "0 0 auto" }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 3,
                    background: colourOf(gameState, t.email),
                    flex: "0 0 auto",
                  }}
                />
                <Text size="sm" fw={won ? 800 : 500} truncate>
                  {name(t.email)}
                </Text>
                <Text size="sm" fw={800} c={won ? "yellow.4" : undefined}>
                  {t.strength}
                </Text>
              </Group>
              <Group gap={4} wrap="wrap" style={{ minWidth: 0 }}>
                {line.length ? (
                  line.map((c, i) => (
                    <CardFace key={i} card={c} width={34} dimmed={!won} />
                  ))
                ) : (
                  <Text size="xs" c="dimmed">
                    nothing
                  </Text>
                )}
              </Group>
            </Group>
          );
        })}
        <Text size="xs" c="dimmed">
          {name(gameState.condottiere)}{" "}
          {gameState.condottiere === me ? "hold" : "holds"} the Condottiere and{" "}
          {gameState.condottiere === me ? "choose" : "chooses"} the next
          battlefield.
        </Text>
      </Stack>
    </div>
  );
}
