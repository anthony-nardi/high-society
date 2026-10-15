import { Group, Text } from "@mantine/core";
import CardFront from "../../../card/CardFront";
import { groupRuns } from "../../scoring";

/** A player's cards grouped into runs, each run overlapping like a fanned set. */
export default function PlayerCards({
  cards,
  size = "sm",
}: {
  cards?: number[];
  size?: "sm" | "md";
}) {
  const runs = groupRuns(cards || []);
  const width = size === "md" ? 48 : 40;

  if (runs.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        No cards yet
      </Text>
    );
  }

  return (
    <Group gap="sm" wrap="wrap" align="flex-end">
      {runs.map((run) => (
        <Group
          key={run[0]}
          gap={0}
          wrap="nowrap"
          role="group"
          aria-label={
            run.length > 1
              ? `Run ${run[0]} to ${run[run.length - 1]}, scores ${run[0]}`
              : `Card ${run[0]}`
          }
          style={{
            padding: run.length > 1 ? 2 : 0,
            borderRadius: 8,
            outline:
              run.length > 1
                ? "2px solid var(--mantine-color-green-6)"
                : undefined,
          }}
        >
          {run.map((card, index) => (
            <div
              key={card}
              style={{
                width,
                marginLeft: index === 0 ? 0 : -Math.round(width * 0.45),
              }}
            >
              <CardFront card={card} size="sm" />
            </div>
          ))}
        </Group>
      ))}
    </Group>
  );
}
