import { Badge, Button, Group, Loader, Stack, Text } from "@mantine/core";
import {
  Journey,
  Railroad,
  RideTheRailsGameState,
  RideTheRailsPlayerState,
} from "../types";
import displayName, { isBotName } from "../../../shared/utils/displayName";
import ThinkingDots from "../../../shared/components/ThinkingDots";
import {
  buildLimit,
  cityName,
  COLOURS,
  label,
  openRailroads,
  payoutsFor,
  placementsLeft,
  sharesOf,
  traceJourney,
} from "../board";
import classes from "./ActionPanel.module.css";

/** What the player is in the middle of: a railroad to build, or a journey being planned. */
export type Pending =
  | { kind: "build"; railroad: Railroad }
  | { kind: "ride"; journey: Journey }
  | null;

function RailroadButton({
  railroad,
  children,
  onClick,
  disabled,
  selected,
}: {
  railroad: Railroad;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  selected?: boolean;
}) {
  const dark = railroad === "YELLOW";
  return (
    <Button
      size="xs"
      onClick={onClick}
      disabled={disabled}
      variant={selected ? "filled" : "light"}
      style={{
        background: selected ? COLOURS[railroad] : `${COLOURS[railroad]}33`,
        color: selected ? (dark ? "#222" : "#fff") : undefined,
        borderLeft: `6px solid ${COLOURS[railroad]}`,
      }}
      aria-pressed={selected}
    >
      {children}
    </Button>
  );
}

/** Fixed strip: the choices of the current phase, or what is being waited for. */
export default function ActionPanel({
  gameState,
  me,
  pending,
  loading,
  onShare,
  onRailroad,
  onEndBuild,
  onLeg,
  onUndoLeg,
  onDeliver,
  onCancel,
}: {
  gameState: RideTheRailsGameState;
  me: RideTheRailsPlayerState;
  pending: Pending;
  loading: boolean;
  onShare: (railroad: Railroad) => void;
  onRailroad: (railroad: Railroad) => void;
  onEndBuild: () => void;
  onLeg: (railroad: Railroad, to: number) => void;
  onUndoLeg: () => void;
  onDeliver: () => void;
  onCancel: () => void;
}) {
  const acting = gameState.activePlayer === me.email;
  const who = displayName(gameState.activePlayer);
  const phaseLabel =
    gameState.phase === "SHARE"
      ? "taking shares"
      : gameState.phase === "BUILD"
        ? "building track"
        : "riding the rails";

  if (!acting) {
    return (
      <div
        className={`${classes.panel} ${classes.compact} safe-bottom`}
        data-testid="action-panel"
      >
        <Stack gap={6} align="center">
          <Text size="sm" c="dimmed" ta="center">
            {loading ? (
              <>
                Sending your move
                <ThinkingDots />
              </>
            ) : (
              <>
                Round {gameState.round}, {phaseLabel}: waiting for {who}.
                {isBotName(gameState.activePlayer) && <ThinkingDots />}
              </>
            )}
          </Text>
        </Stack>
      </div>
    );
  }

  let body: React.ReactNode;
  let hint: string;

  if (loading) {
    body = <Loader size="xs" color="yellow" />;
    hint = "Sending your move…";
  } else if (gameState.phase === "SHARE") {
    const open = openRailroads(gameState);
    body = (
      <Group gap={6} justify="center" wrap="wrap" aria-label="Railroads">
        {open.map((r) => (
          <RailroadButton
            key={r}
            railroad={r}
            disabled={gameState.supply[r] <= 0}
            onClick={() => onShare(r)}
          >
            {label(r)} · {gameState.supply[r]} left
            {sharesOf(me, r) ? ` · you hold ${sharesOf(me, r)}` : ""}
          </RailroadButton>
        ))}
      </Group>
    );
    hint =
      "Take one share. Shares let you build that railroad and pay $1 per link whenever its track carries a passenger.";
  } else if (gameState.phase === "BUILD") {
    const mine = openRailroads(gameState).filter((r) => sharesOf(me, r) > 0);
    const left = placementsLeft(gameState, false);
    body = (
      <Group gap={6} justify="center" wrap="wrap">
        {mine.map((r) => (
          <RailroadButton
            key={r}
            railroad={r}
            selected={pending?.kind === "build" && pending.railroad === r}
            disabled={gameState.supply[r] <= 0}
            onClick={() => onRailroad(r)}
          >
            {label(r)}
          </RailroadButton>
        ))}
        <Button variant="default" size="xs" onClick={onEndBuild}>
          {gameState.built === 0 ? "Build nothing" : "Done building"}
        </Button>
      </Group>
    );
    hint =
      pending?.kind === "build"
        ? `Tap a glowing hex to lay ${label(pending.railroad)} track. ${left} of ${buildLimit(gameState.players.length)} placement${left === 1 ? "" : "s"} left${gameState.mountainBuilt ? " after the mountains" : ""}.`
        : `Pick a railroad you hold, then tap the map. Up to ${left} locomotive${left === 1 ? "" : "s"} this turn; one fewer if you enter the mountains.`;
  } else {
    const journey = pending?.kind === "ride" ? pending.journey : null;
    if (!journey) {
      body = null;
      hint =
        "Tap a city with a passenger (the white figure) whose rails lead somewhere.";
    } else {
      const traced = traceJourney(gameState, journey);
      const pay = payoutsFor(gameState, traced.route);
      const mine = pay.dividends.find((d) => d.email === me.email)?.amount ?? 0;
      const others = pay.dividends.filter((d) => d.email !== me.email);
      body = (
        <Stack gap={6} align="center">
          <Group gap={6} justify="center" wrap="wrap" aria-label="Next links">
            {traced.next.map(({ railroad, link }) => (
              <RailroadButton
                key={`${railroad}-${link.to}`}
                railroad={railroad}
                onClick={() => onLeg(railroad, link.to)}
              >
                {label(railroad)} to {cityName(link.to)}
              </RailroadButton>
            ))}
          </Group>
          <Group gap={6} justify="center" wrap="wrap">
            {journey.legs.length > 0 && (
              <Button color="yellow" size="xs" onClick={onDeliver}>
                Deliver in {cityName(traced.at)} for ${pay.earned}
                {mine ? ` + $${mine} dividends` : ""}
              </Button>
            )}
            {journey.legs.length > 0 && (
              <Button variant="default" size="xs" onClick={onUndoLeg}>
                Back a link
              </Button>
            )}
            <Button variant="default" size="xs" onClick={onCancel}>
              Cancel
            </Button>
          </Group>
        </Stack>
      );
      hint =
        journey.legs.length === 0
          ? `Passenger from ${cityName(journey.start)}. Choose the first link, or tap a lit city on the map.`
          : others.length
            ? `Others would collect: ${others.map((d) => `${displayName(d.email)} $${d.amount}`).join(", ")}.`
            : "No one else holds shares in these railroads.";
    }
  }

  return (
    <div
      className={`${classes.panel} ${classes.active} safe-bottom`}
      data-testid="action-panel"
    >
      <Stack gap={6} align="center">
        <Group gap="sm" justify="center" wrap="wrap">
          <Badge color="yellow" variant="filled" radius="sm" size="lg">
            Your turn: {phaseLabel}
          </Badge>
        </Group>
        {body}
        <Text size="sm" c="dimmed" ta="center">
          {hint}
        </Text>
      </Stack>
    </div>
  );
}
