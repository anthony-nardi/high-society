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
import { ClansGameState } from "./types";
import Map, { Highlight } from "./components/Map";
import PlayerOverview from "./components/PlayerOverview";
import ActionPanel from "./components/ActionPanel";
import GameOver from "./components/GameOver";
import moveClansHuts from "../client/moveClansHuts";
import {
  COLOUR_HEX,
  COLOURS,
  currentEpoch,
  destinationsOf,
  EPOCHS,
  label,
  movableFrom,
  TERRAIN_FILL,
  VILLAGE_COUNT,
  villagesFounded,
} from "./board";
import panelClasses from "./components/ActionPanel.module.css";
import tableClasses from "../../shared/table.module.css";

export default function Game() {
  const { user, isSignedIn } = useUserContext();
  const { lobbyId } = useLobbyContext();
  const { gameState, isLoading } = useGameState<ClansGameState>();
  const [loading, setLoading] = useState(false);
  const [selection, setSelection] = useState<{
    key: string;
    from: number | null;
  }>({ key: "", from: null });

  useGameSounds(gameState?.notification);
  useBotNudge(lobbyId, gameState);

  const me = useMemo(() => {
    if (!gameState || !user) return null;
    return gameState.players.find((p) => p.email === user.email) || null;
  }, [gameState, user]);

  const acting = !!gameState && !!me && me.email === gameState.activePlayer;
  const inProgress = gameState?.status === "IN_PROGRESS";
  useTurnAlert(acting && inProgress, "Clans");

  const turnKey = `${gameState?.turn}:${gameState?.activePlayer}`;
  const selected = selection.key === turnKey ? selection.from : null;
  const select = useCallback(
    (from: number | null) => setSelection({ key: turnKey, from }),
    [turnKey],
  );

  const lobbyUID = `${lobbyId}`;
  const call = useCallback(async (fn: () => Promise<unknown>) => {
    setLoading(true);
    try {
      await fn();
    } finally {
      setLoading(false);
    }
  }, []);

  const highlights = useMemo(() => {
    const h: { [t: number]: Highlight } = {};
    if (!gameState) return h;
    for (const t of gameState.lastMove?.founded || []) h[t] = "founded";
    if (!acting || loading) return h;
    if (selected === null) {
      for (const t of movableFrom(gameState)) h[t] = "selectable";
    } else {
      h[selected] = "selected";
      for (const t of destinationsOf(gameState, selected)) h[t] = "destination";
    }
    return h;
  }, [gameState, acting, loading, selected]);

  const move = useCallback(
    (to: number) => {
      if (selected === null) return;
      const from = selected;
      void call(() => moveClansHuts({ lobbyUID, from, to }));
    },
    [selected, call, lobbyUID],
  );

  const handleTerritory = useCallback(
    (t: number) => {
      if (!gameState || !acting || loading) return;
      if (selected === null) {
        if (movableFrom(gameState).includes(t)) select(t);
      } else if (t === selected) {
        select(null);
      } else if (destinationsOf(gameState, selected).includes(t)) {
        move(t);
      } else if (movableFrom(gameState).includes(t)) {
        select(t);
      }
    },
    [gameState, acting, loading, selected, select, move],
  );

  const isGameActive =
    isSignedIn && gameState && gameState.status && lobbyId && user;
  const isGameOver = isGameActive && gameState?.status === "GAME_OVER";

  if (gameState === null) return null;
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

  const founded = villagesFounded(gameState);
  const epochIndex = currentEpoch(gameState);
  const epoch = EPOCHS[epochIndex];
  const before = EPOCHS.slice(0, epochIndex).reduce(
    (n, e) => n + e.villages,
    0,
  );
  const leftInEpoch = epoch.villages - (founded - before);
  const lastVillages = (gameState.villages || []).slice(-2).reverse();

  return (
    <>
      <TurnBanner active={acting && inProgress} />
      <Container fluid px="md" pt={44} pb="md">
        <div className={tableClasses.table}>
          <div
            className={`${tableClasses.board} ${loading ? tableClasses.boardPending : ""}`}
            style={{ order: 1 }}
            aria-busy={loading}
          >
            <Stack gap="xs" align="center">
              <Group gap="sm" justify="center" wrap="wrap">
                <Badge variant="light" radius="sm" size="lg">
                  Epoch {epochIndex + 1} · village {founded + 1} of{" "}
                  {VILLAGE_COUNT} · {leftInEpoch} left in epoch
                </Badge>
                {epoch.favoured && (
                  <Badge
                    variant="light"
                    radius="sm"
                    size="lg"
                    style={{
                      borderLeft: `6px solid ${TERRAIN_FILL[epoch.favoured]}`,
                    }}
                  >
                    {label(epoch.favoured)} +{epoch.bonus}
                  </Badge>
                )}
                {epoch.forbidden && (
                  <Badge
                    variant="light"
                    color="red"
                    radius="sm"
                    size="lg"
                    style={{
                      borderLeft: `6px solid ${TERRAIN_FILL[epoch.forbidden]}`,
                    }}
                  >
                    {label(epoch.forbidden)} forbidden
                  </Badge>
                )}
              </Group>
              <Group gap={4} wrap="wrap" aria-label="Scores by clan">
                {COLOURS.map((c) => (
                  <span
                    key={c}
                    title={`${label(c)} clan`}
                    style={{
                      padding: "2px 8px",
                      borderRadius: 6,
                      background: COLOUR_HEX[c],
                      color: c === "YELLOW" ? "#222" : "#fff",
                      fontSize: 12,
                      fontWeight: 700,
                      border:
                        me?.colour === c
                          ? "2px solid #ffd86b"
                          : "2px solid transparent",
                    }}
                  >
                    {gameState.scores[c]}
                  </span>
                ))}
              </Group>
              <Map
                gameState={gameState}
                highlights={highlights}
                onTerritory={handleTerritory}
              />
              {lastVillages.length > 0 && (
                <Text size="xs" c="dimmed" ta="center">
                  {lastVillages
                    .map((v, i) =>
                      v.destroyed
                        ? `Village ${founded - i} razed in ${label(v.terrain).toLowerCase()}`
                        : `Village ${founded - i}: ${v.points} to ${v.colours.map(label).join(", ")}`,
                    )
                    .join(" · ")}
                </Text>
              )}
            </Stack>
          </div>
          <div
            className={tableClasses.players}
            style={{ order: 2, gridTemplateColumns: "1fr" }}
          >
            <Stack gap="sm">
              {gameState.players.map((player) => (
                <PlayerOverview
                  key={player.email}
                  player={player}
                  gameState={gameState}
                />
              ))}
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
          selected={selected}
          loading={loading}
          onDestination={move}
          onCancel={() => select(null)}
        />
      )}
    </>
  );
}
