import { Badge, Button, Group, Loader, Stack, Text } from "@mantine/core";
import { useState } from "react";
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
  linkCount,
  openRailroads,
  payoutsFor,
  placementsLeft,
  sharesOf,
  traceJourney,
} from "../board";
import classes from "./ActionPanel.module.css";

/** What the player is in the middle of. */
export type Pending =
  /** A railroad chosen to build with. */
  | { kind: "build"; railroad: Railroad }
  /** A hex tapped where more than one railroad could go. */
  | { kind: "pick"; hex: number; railroads: Railroad[] }
  /** A journey being planned. */
  | { kind: "ride"; journey: Journey }
  | null;

export function RailroadButton({
  railroad,
  children,
  onClick,
  disabled,
  selected,
  size = "xs",
}: {
  railroad: Railroad;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  selected?: boolean;
  size?: "xs" | "sm";
}) {
  const dark = railroad === "YELLOW";
  return (
    <Button
      size={size}
      onClick={onClick}
      disabled={disabled}
      variant={selected ? "filled" : "light"}
      style={{
        background: selected ? COLOURS[railroad] : `${COLOURS[railroad]}33`,
        color: selected ? (dark ? "#222" : "#fff") : undefined,
        borderLeft: `6px solid ${COLOURS[railroad]}`,
        height: "auto",
        minHeight: 30,
        padding: "4px 10px",
      }}
      aria-pressed={selected}
    >
      {children}
    </Button>
  );
}

function Chip({
  children,
  colour = "rgba(255,255,255,0.12)",
  text,
}: {
  children: React.ReactNode;
  colour?: string;
  text?: string;
}) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 999,
        background: colour,
        color: text,
        fontSize: 12,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
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
  onBuildAt,
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
  onBuildAt: (railroad: Railroad, hex: number) => void;
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

  // Ending a build turn with placements left asks twice; the question lapses with the turn.
  const turnKey = `${gameState.turn}:${gameState.activePlayer}:${gameState.phase}`;
  const [confirmKey, setConfirmKey] = useState("");
  const confirmEnd = confirmKey === turnKey;
  const setConfirmEnd = (on: boolean) => setConfirmKey(on ? turnKey : "");

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
  let headline: React.ReactNode = null;

  if (gameState.phase === "SHARE") {
    const open = openRailroads(gameState);
    body = (
      <Group gap={6} justify="center" wrap="wrap" aria-label="Railroads">
        {open.map((r) => {
          const holders = gameState.players
            .filter((p) => sharesOf(p, r) > 0)
            .map(
              (p) =>
                `${p.email === me.email ? "you" : displayName(p.email)} ${sharesOf(p, r)}`,
            );
          const links = linkCount(gameState, r);
          return (
            <RailroadButton
              key={r}
              railroad={r}
              size="sm"
              disabled={loading || gameState.supply[r] <= 0}
              onClick={() => onShare(r)}
            >
              <span
                style={{
                  display: "block",
                  textAlign: "left",
                  lineHeight: 1.25,
                }}
              >
                <b>{label(r)}</b> · {gameState.supply[r]} left · {links} link
                {links === 1 ? "" : "s"}
                <br />
                <span style={{ fontWeight: 400, fontSize: 11 }}>
                  {holders.length
                    ? `Held: ${holders.join(", ")}`
                    : "Nobody holds it yet"}
                </span>
              </span>
            </RailroadButton>
          );
        })}
      </Group>
    );
    hint =
      "Take one share. It lets you build that railroad and pays $1 per link whenever its track carries a passenger.";
  } else if (gameState.phase === "BUILD") {
    const mine = openRailroads(gameState).filter((r) => sharesOf(me, r) > 0);
    const left = placementsLeft(gameState, false);
    const limit = buildLimit(gameState.players.length);
    headline = (
      <Badge
        color={left > 0 ? "yellow" : "gray"}
        variant="filled"
        radius="sm"
        size="lg"
        aria-live="polite"
      >
        {left} of {limit} left{gameState.mountainBuilt ? " (mountains)" : ""}
      </Badge>
    );
    if (pending?.kind === "pick") {
      body = (
        <Group gap={6} justify="center" wrap="wrap" aria-label="Which railroad">
          {pending.railroads.map((r) => (
            <RailroadButton
              key={r}
              railroad={r}
              disabled={loading}
              onClick={() => onBuildAt(r, pending.hex)}
            >
              {label(r)} into {cityName(pending.hex)}
            </RailroadButton>
          ))}
          <Button variant="default" size="xs" onClick={onCancel}>
            Cancel
          </Button>
        </Group>
      );
      hint = "More than one of your railroads can reach that hex. Which one?";
    } else {
      body = (
        <Group gap={6} justify="center" wrap="wrap">
          {mine.length > 1 &&
            mine.map((r) => (
              <RailroadButton
                key={r}
                railroad={r}
                selected={pending?.kind === "build" && pending.railroad === r}
                disabled={gameState.supply[r] <= 0}
                onClick={() =>
                  pending?.kind === "build" && pending.railroad === r
                    ? onCancel()
                    : onRailroad(r)
                }
              >
                {label(r)}
              </RailroadButton>
            ))}
          <Button
            variant={confirmEnd ? "filled" : "default"}
            color={confirmEnd ? "yellow" : undefined}
            size="xs"
            disabled={loading}
            onClick={() => {
              if (left > 0 && !confirmEnd) setConfirmEnd(true);
              else onEndBuild();
            }}
          >
            {confirmEnd
              ? `Finish with ${left} unused?`
              : gameState.built === 0
                ? "Build nothing"
                : "Done building"}
          </Button>
          {confirmEnd && (
            <Button
              variant="subtle"
              size="xs"
              onClick={() => setConfirmEnd(false)}
            >
              Keep building
            </Button>
          )}
        </Group>
      );
      hint =
        pending?.kind === "build"
          ? `Tap a glowing hex to lay ${label(pending.railroad)} track. Tap ${label(pending.railroad)} again to lay any railroad.`
          : mine.length > 1
            ? "Tap any glowing hex; if two of your railroads could go there you choose. Brown glow means mountains, which cost a placement."
            : "Tap a glowing hex to lay track. Brown glow means mountains, which cost a placement.";
    }
  } else {
    const journey = pending?.kind === "ride" ? pending.journey : null;
    if (!journey) {
      body = null;
      hint =
        "Tap a city with a bright passenger: those have rails leading out.";
    } else {
      const traced = traceJourney(gameState, journey);
      const pay = payoutsFor(gameState, traced.route);
      const mine = pay.dividends.find((d) => d.email === me.email)?.amount ?? 0;
      const others = pay.dividends.filter((d) => d.email !== me.email);
      headline = (
        <Group gap={4} justify="center" wrap="wrap" aria-label="Payout so far">
          <Chip colour="var(--mantine-color-yellow-5)" text="#222">
            You +${pay.earned + mine}
            {mine ? ` (${pay.earned} ride, ${mine} dividends)` : ""}
          </Chip>
          {others.map((d) => (
            <Chip key={d.email}>
              {displayName(d.email)} +${d.amount}
            </Chip>
          ))}
        </Group>
      );
      body = (
        <Stack gap={6} align="center">
          <Group gap={6} justify="center" wrap="wrap" aria-label="Next links">
            {traced.next.map(({ railroad, link }) => (
              <RailroadButton
                key={`${railroad}-${link.to}`}
                railroad={railroad}
                disabled={loading}
                onClick={() => onLeg(railroad, link.to)}
              >
                {label(railroad)} to {cityName(link.to)}
              </RailroadButton>
            ))}
          </Group>
          <Group gap={6} justify="center" wrap="wrap">
            {journey.legs.length > 0 && (
              <Button
                color="yellow"
                size="xs"
                disabled={loading}
                onClick={onDeliver}
              >
                Deliver in {cityName(traced.at)}
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
          ? `Passenger from ${cityName(journey.start)}. Pick the first link, or tap a lit city on the map.`
          : "Add links from the lit cities, or deliver. The trail shows each leg in its railroad's colour.";
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
          {headline}
          {loading && <Loader size="xs" color="yellow" />}
        </Group>
        {body}
        <Text size="sm" c="dimmed" ta="center">
          {loading ? "Sending your move…" : hint}
        </Text>
      </Stack>
    </div>
  );
}
