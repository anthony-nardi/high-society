import { Badge, Button, Group, Loader, Stack, Text } from "@mantine/core";
import { ClansGameState, ClansPlayerState, Village } from "../types";
import displayName, { isBotName } from "../../../shared/utils/displayName";
import ThinkingDots from "../../../shared/components/ThinkingDots";
import {
  COLOUR_HEX,
  countHuts,
  destinationsOf,
  hutsAt,
  label,
  preview,
  terrainOf,
} from "../board";
import classes from "./ActionPanel.module.css";

function Outcome({
  village,
  me,
}: {
  village: Omit<Village, "founder">;
  me: ClansPlayerState;
}) {
  if (village.destroyed)
    return (
      <Text size="xs" c="red.4">
        Village in {label(village.terrain).toLowerCase()} would be razed:
        forbidden this epoch.
      </Text>
    );
  const mine = village.colours.includes(me.colour);
  return (
    <Text size="xs" c={mine ? "yellow.4" : "dimmed"}>
      Village worth {village.points}
      {village.bonus
        ? ` (${village.bonus} for ${label(village.terrain).toLowerCase()})`
        : ""}{" "}
      to{" "}
      {village.colours.map((c) => (
        <span
          key={c}
          style={{
            display: "inline-block",
            width: 10,
            height: 10,
            borderRadius: 3,
            background: COLOUR_HEX[c],
            marginRight: 3,
            verticalAlign: "middle",
          }}
          aria-label={label(c)}
        />
      ))}
      {village.strife ? " after strife" : ""}
      {mine ? " · yours among them" : ""}
    </Text>
  );
}

/** Fixed strip: pick a group, then where it goes, with what each choice would found. */
export default function ActionPanel({
  gameState,
  me,
  selected,
  loading,
  onDestination,
  onCancel,
}: {
  gameState: ClansGameState;
  me: ClansPlayerState;
  /** The territory whose huts are being moved. */
  selected: number | null;
  loading: boolean;
  onDestination: (to: number) => void;
  onCancel: () => void;
}) {
  const acting = gameState.activePlayer === me.email;
  const who = displayName(gameState.activePlayer);

  if (!acting) {
    return (
      <div
        className={`${classes.panel} ${classes.compact} safe-bottom`}
        data-testid="action-panel"
      >
        <Text size="sm" c="dimmed" ta="center">
          {loading ? (
            <>
              Sending your move
              <ThinkingDots />
            </>
          ) : (
            <>
              Waiting for {who} to move a group of huts.
              {isBotName(gameState.activePlayer) && <ThinkingDots />}
            </>
          )}
        </Text>
      </div>
    );
  }

  const destinations =
    selected === null ? [] : destinationsOf(gameState, selected);
  const moving = selected === null ? 0 : countHuts(hutsAt(gameState, selected));

  return (
    <div
      className={`${classes.panel} ${classes.active} safe-bottom`}
      data-testid="action-panel"
    >
      <Stack gap={6} align="center">
        <Group gap="sm" justify="center" wrap="wrap">
          <Badge color="yellow" variant="filled" radius="sm" size="lg">
            Your turn
          </Badge>
          <Badge
            variant="light"
            radius="sm"
            size="lg"
            style={{ borderLeft: `6px solid ${COLOUR_HEX[me.colour]}` }}
          >
            Your clan: {label(me.colour)}
          </Badge>
          {loading && <Loader size="xs" color="yellow" />}
          {selected !== null && !loading && (
            <Button variant="default" size="xs" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </Group>
        {selected !== null && !loading && (
          <Stack gap={4} align="center">
            <Group gap={6} justify="center" wrap="wrap">
              {destinations.map((to) => (
                <Button
                  key={to}
                  size="xs"
                  variant="light"
                  onClick={() => onDestination(to)}
                >
                  {label(terrainOf(to))} ({countHuts(hutsAt(gameState, to))}{" "}
                  there)
                </Button>
              ))}
            </Group>
            {destinations.map((to) => {
              const founded = preview(gameState, selected, to);
              return founded.length ? (
                <Stack key={`p-${to}`} gap={0} align="center">
                  <Text size="xs" c="dimmed">
                    Into {label(terrainOf(to)).toLowerCase()}:
                  </Text>
                  {founded.map((v) => (
                    <Outcome key={v.territory} village={v} me={me} />
                  ))}
                </Stack>
              ) : null;
            })}
          </Stack>
        )}
        <Text size="sm" c="dimmed" ta="center">
          {loading
            ? "Sending your move…"
            : selected === null
              ? "Tap a glowing group of huts to move all of them. Groups of seven or more stay put."
              : `Moving ${moving} hut${moving === 1 ? "" : "s"}: tap a glowing neighbour on the map, or a button above.`}
        </Text>
      </Stack>
    </div>
  );
}
