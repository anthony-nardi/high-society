import {
  Badge,
  Center,
  Container,
  Group,
  Loader,
  Stack,
  Text,
} from "@mantine/core";
import { useCallback, useMemo, useState } from "react";
import useGameState from "../../shared/hooks/useGameState";
import { useUserContext } from "../../shared/context/useUserContext";
import useTurnAlert from "../../shared/hooks/useTurnAlert";
import useGameSounds from "../../shared/hooks/useGameSounds";
import useBotNudge from "../../shared/hooks/useBotNudge";
import { useLobbyContext } from "../../shared/context/useLobbyContext";
import TurnBanner from "../../shared/components/TurnBanner";
import displayName from "../../shared/utils/displayName";
import { Railroad, RideTheRailsGameState } from "./types";
import Map, { Highlight, Leg } from "./components/Map";
import PlayerOverview from "./components/PlayerOverview";
import ActionPanel, { Pending } from "./components/ActionPanel";
import GameOver from "./components/GameOver";
import TurnOrder from "./components/TurnOrder";
import Legend from "./components/Legend";
import takeRideTheRailsShare from "../client/takeRideTheRailsShare";
import buildRideTheRailsTrack from "../client/buildRideTheRailsTrack";
import endRideTheRailsBuild from "../client/endRideTheRailsBuild";
import rideTheRails from "../client/rideTheRails";
import {
  applyBuild,
  cityName,
  COLOURS,
  label,
  legalHexes,
  legsOf,
  openRailroads,
  railroadsFor,
  RAILROADS,
  ridableCities,
  sharesOf,
  traceJourney,
} from "./board";
import panelClasses from "./components/ActionPanel.module.css";
import classes from "./rails.module.css";

/** A locomotive shown before the server confirms it lives this long at most. */
const OPTIMISTIC_TTL_MS = 8000;

export default function Game() {
  const { user, isSignedIn } = useUserContext();
  const { lobbyId } = useLobbyContext();
  const { gameState: serverState, isLoading } =
    useGameState<RideTheRailsGameState>();
  const [loading, setLoading] = useState(false);
  const [pendingState, setPendingState] = useState<{
    key: string;
    pending: Pending;
  }>({ key: "", pending: null });
  const [preview, setPreview] = useState<{
    turn: number;
    at: number;
    state: RideTheRailsGameState;
  } | null>(null);

  useGameSounds(serverState?.notification);
  useBotNudge(lobbyId, serverState);

  // What the table shows: the server's state, or a locomotive laid a moment ago.
  const gameState =
    serverState && preview && preview.turn === serverState.turn
      ? preview.state
      : serverState;

  const me = useMemo(() => {
    if (!gameState || !user) return null;
    return gameState.players.find((p) => p.email === user.email) || null;
  }, [gameState, user]);

  const acting = !!gameState && !!me && me.email === gameState.activePlayer;
  const inProgress = gameState?.status === "IN_PROGRESS";
  useTurnAlert(acting && inProgress, "Ride the Rails");

  // A build selection survives placements within the turn; a journey resets on any change.
  const turnKey =
    gameState?.phase === "BUILD"
      ? `${gameState.round}:${gameState.phase}:${gameState.activePlayer}`
      : `${gameState?.turn}:${gameState?.phase}:${gameState?.activePlayer}`;
  const pending = pendingState.key === turnKey ? pendingState.pending : null;
  const setPending = useCallback(
    (p: Pending) => setPendingState({ key: turnKey, pending: p }),
    [turnKey],
  );

  const lobbyUID = `${lobbyId}`;
  const call = useCallback(async (fn: () => Promise<unknown>) => {
    setLoading(true);
    try {
      return await fn();
    } finally {
      setLoading(false);
    }
  }, []);

  const build = useCallback(
    (railroad: Railroad, hex: number) => {
      if (!serverState || !gameState) return;
      const at = Date.now();
      setPreview({
        turn: serverState.turn,
        at,
        state: applyBuild(gameState, railroad, hex),
      });
      // Never show a locomotive the server has not confirmed for long.
      window.setTimeout(
        () => setPreview((p) => (p && p.at === at ? null : p)),
        OPTIMISTIC_TTL_MS,
      );
      void call(async () => {
        const accepted = await buildRideTheRailsTrack({
          lobbyUID,
          railroad,
          hex,
        });
        if (!accepted) setPreview(null);
      });
    },
    [serverState, gameState, call, lobbyUID],
  );

  // The one railroad you hold is chosen for you when building.
  const buildRailroad: Railroad | null = useMemo(() => {
    if (!gameState || !me || gameState.phase !== "BUILD") return null;
    if (pending?.kind === "build") return pending.railroad;
    const mine = openRailroads(gameState).filter(
      (r) => sharesOf(me, r) > 0 && gameState.supply[r] > 0,
    );
    return mine.length === 1 ? mine[0] : null;
  }, [gameState, me, pending]);

  const journey = pending?.kind === "ride" ? pending.journey : null;
  const traced = useMemo(
    () => (gameState && journey ? traceJourney(gameState, journey) : null),
    [gameState, journey],
  );

  const highlights = useMemo(() => {
    const h: { [hex: number]: Highlight } = {};
    if (!gameState || !me || !acting) return h;
    if (gameState.phase === "BUILD") {
      const railroads = buildRailroad
        ? [buildRailroad]
        : openRailroads(gameState).filter((r) => sharesOf(me, r) > 0);
      for (const r of railroads)
        for (const hex of legalHexes(gameState, me, r)) h[hex] = "selectable";
      if (pending?.kind === "pick") h[pending.hex] = "selected";
    } else if (gameState.phase === "RIDE") {
      if (!journey) {
        for (const city of ridableCities(gameState)) h[city] = "selectable";
      } else if (traced) {
        for (const hex of traced.route.hexes) h[hex] = "route";
        h[journey.start] = "selected";
        for (const { link } of traced.next) h[link.to] = "selectable";
      }
    }
    return h;
  }, [gameState, me, acting, buildRailroad, pending, journey, traced]);

  const handleHex = useCallback(
    (hex: number) => {
      if (!gameState || !me || !acting || loading) return;
      if (gameState.phase === "BUILD") {
        if (buildRailroad) {
          build(buildRailroad, hex);
          return;
        }
        const options = railroadsFor(gameState, me, hex);
        if (options.length === 1) build(options[0], hex);
        else if (options.length > 1)
          setPending({ kind: "pick", hex, railroads: options });
      } else if (gameState.phase === "RIDE") {
        if (!journey) {
          setPending({ kind: "ride", journey: { start: hex, legs: [] } });
          return;
        }
        if (!traced) return;
        const options = traced.next.filter(({ link }) => link.to === hex);
        if (options.length === 0) return;
        // Prefer the railroad that pays you most; the panel offers the rest.
        const best = [...options].sort(
          (a, b) => sharesOf(me, b.railroad) - sharesOf(me, a.railroad),
        )[0];
        setPending({
          kind: "ride",
          journey: {
            start: journey.start,
            legs: [...journey.legs, { railroad: best.railroad, to: hex }],
          },
        });
      }
    },
    [
      gameState,
      me,
      acting,
      loading,
      buildRailroad,
      build,
      journey,
      traced,
      setPending,
    ],
  );

  const isGameActive =
    isSignedIn && gameState && gameState.status && lobbyId && user;
  const isGameOver = isGameActive && gameState?.status === "GAME_OVER";

  if (!gameState) return null;
  if (isLoading) {
    return (
      <Center>
        <Loader />
      </Center>
    );
  }
  if (isGameOver) {
    return (
      <GameOver gameState={gameState} lobbyId={lobbyId?.toString() as string} />
    );
  }

  const lastRide = gameState.lastRide;
  const showLastRide =
    !!lastRide &&
    !traced &&
    (gameState.phase === "RIDE" || gameState.lastMove?.type === "ride");
  const legs: Leg[] | undefined = traced
    ? legsOf(gameState, journey as NonNullable<typeof journey>)
    : showLastRide
      ? legsOf(gameState, lastRide.journey)
      : undefined;
  const replayKey =
    showLastRide && lastRide.email !== me?.email
      ? `${gameState.turn}:${lastRide.email}`
      : undefined;

  return (
    <>
      <TurnBanner active={acting && inProgress} />
      <Container fluid px="md" pt={44} pb="md">
        <div className={classes.table}>
          <div
            className={`${classes.board} ${loading && gameState.phase !== "BUILD" ? classes.boardPending : ""}`}
            aria-busy={loading}
          >
            <Stack gap="xs" align="center">
              <Group gap="sm" justify="center" wrap="wrap">
                <Badge variant="light" radius="sm" size="lg">
                  Round {gameState.round} of 6 ·{" "}
                  {gameState.phase === "SHARE"
                    ? "shares"
                    : gameState.phase === "BUILD"
                      ? "building"
                      : "riding"}
                </Badge>
                <Group gap={4} wrap="wrap" aria-label="Locomotives left">
                  {RAILROADS.map((r) => {
                    const open = openRailroads(gameState).includes(r);
                    return (
                      <span
                        key={r}
                        title={`${label(r)}: ${open ? `${gameState.supply[r]} locomotives left` : "not open yet"}`}
                        style={{
                          padding: "2px 7px",
                          borderRadius: 6,
                          background: COLOURS[r],
                          color: r === "YELLOW" ? "#222" : "#fff",
                          fontSize: 12,
                          fontWeight: 700,
                          opacity: open ? 1 : 0.3,
                        }}
                      >
                        {open ? gameState.supply[r] : "–"}
                      </span>
                    );
                  })}
                </Group>
                <Badge variant="light" color="gray" radius="sm" size="lg">
                  {(gameState.passengers || []).length} passengers
                </Badge>
              </Group>
              <TurnOrder gameState={gameState} />
              <Map
                gameState={gameState}
                highlights={highlights}
                onHex={handleHex}
                legs={legs}
                replayKey={replayKey}
              />
              <Legend />
              {showLastRide && (
                <Text size="sm" c="dimmed" ta="center">
                  {displayName(lastRide.email)} carried a passenger from{" "}
                  {cityName(lastRide.journey.start)} to{" "}
                  {cityName(
                    lastRide.journey.legs[lastRide.journey.legs.length - 1].to,
                  )}{" "}
                  for ${lastRide.earned}
                  {lastRide.dividends.length
                    ? `; dividends ${lastRide.dividends
                        .map((d) => `${displayName(d.email)} $${d.amount}`)
                        .join(", ")}`
                    : ""}
                  .
                </Text>
              )}
            </Stack>
          </div>
          <div className={classes.players}>
            <Stack gap="sm">
              {gameState.order.map((email) => {
                const player = gameState.players.find((p) => p.email === email);
                return player ? (
                  <PlayerOverview
                    key={player.email}
                    player={player}
                    gameState={gameState}
                  />
                ) : null;
              })}
            </Stack>
          </div>
        </div>
      </Container>
      {me && (
        <div
          className={
            acting ? panelClasses.pageSpacer : panelClasses.pageSpacerCompact
          }
        />
      )}
      {me && (
        <ActionPanel
          gameState={gameState}
          me={me}
          pending={pending}
          loading={loading}
          onShare={(railroad) =>
            void call(() => takeRideTheRailsShare({ lobbyUID, railroad }))
          }
          onRailroad={(railroad) => setPending({ kind: "build", railroad })}
          onBuildAt={(railroad, hex) => {
            setPending(null);
            build(railroad, hex);
          }}
          onEndBuild={() => void call(() => endRideTheRailsBuild({ lobbyUID }))}
          onLeg={(railroad, to) => {
            if (!journey) return;
            setPending({
              kind: "ride",
              journey: {
                start: journey.start,
                legs: [...journey.legs, { railroad, to }],
              },
            });
          }}
          onUndoLeg={() => {
            if (!journey) return;
            setPending({
              kind: "ride",
              journey: {
                start: journey.start,
                legs: journey.legs.slice(0, -1),
              },
            });
          }}
          onDeliver={() => {
            if (!journey || journey.legs.length === 0) return;
            void call(() => rideTheRails({ lobbyUID, journey }));
          }}
          onCancel={() => setPending(null)}
        />
      )}
    </>
  );
}
