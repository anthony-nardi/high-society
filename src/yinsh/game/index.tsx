import {
  Badge,
  Center,
  Container,
  Grid,
  Group,
  Loader,
  Stack,
} from "@mantine/core";
import { useCallback, useMemo, useState } from "react";
import useGameState from "../../shared/hooks/useGameState";
import { useUserContext } from "../../shared/context/useUserContext";
import useTurnAlert from "../../shared/hooks/useTurnAlert";
import useGameSounds from "../../shared/hooks/useGameSounds";
import useBotNudge from "../../shared/hooks/useBotNudge";
import { useLobbyContext } from "../../shared/context/useLobbyContext";
import { Coord, YinshGameState } from "./types";
import Board, { Highlight } from "./components/Board";
import PlayerOverview from "./components/PlayerOverview";
import ActionPanel from "./components/ActionPanel";
import GameOver from "./components/GameOver";
import placeYinshRing from "../client/placeYinshRing";
import moveYinshRing from "../client/moveYinshRing";
import removeYinshRow from "../client/removeYinshRow";
import removeYinshRing from "../client/removeYinshRing";
import {
  isEmpty,
  movesFrom,
  ringAt,
  ringsOf,
  rowWindows,
  sideOf,
  windowCells,
} from "./board";
import panelClasses from "./components/ActionPanel.module.css";

type Selection = { key: string; ring: Coord | null; rowStart: Coord | null };

export default function Game() {
  const { user, isSignedIn } = useUserContext();
  const { lobbyId } = useLobbyContext();
  const { gameState, isLoading } = useGameState<YinshGameState>();
  const [selection, setSelection] = useState<Selection>({
    key: "",
    ring: null,
    rowStart: null,
  });
  const [loading, setLoading] = useState(false);

  useGameSounds(gameState?.notification);
  useBotNudge(lobbyId, gameState);

  const loggedInPlayer = useMemo(() => {
    if (!gameState || !user) return null;
    return gameState.players.find((p) => p.email === user.email) || null;
  }, [gameState, user]);

  const isActive =
    !!gameState &&
    !!loggedInPlayer &&
    loggedInPlayer.email === gameState.activePlayer;

  useTurnAlert(isActive && gameState?.status === "IN_PROGRESS", "YINSH");

  // Selections are tied to the turn and phase they were made in.
  const phaseKey = `${gameState?.turn}:${gameState?.phase}:${gameState?.activePlayer}`;
  const selectedRing = selection.key === phaseKey ? selection.ring : null;
  const rowStart = selection.key === phaseKey ? selection.rowStart : null;
  const select = useCallback(
    (ring: Coord | null, start: Coord | null) =>
      setSelection({ key: phaseKey, ring, rowStart: start }),
    [phaseKey],
  );

  const mySide = gameState
    ? sideOf(gameState, loggedInPlayer?.email)
    : undefined;

  const highlights = useMemo(() => {
    const h: { [coord: Coord]: Highlight } = {};
    if (!gameState) return h;
    if (gameState.lastMove?.from) h[gameState.lastMove.from] = "last";
    if (gameState.lastMove?.to) h[gameState.lastMove.to] = "last";
    if (!isActive || !mySide) return h;
    const phase = gameState.phase;
    if (phase === "MOVE_RING") {
      for (const r of ringsOf(gameState, mySide)) h[r] = "selected";
      if (selectedRing) {
        for (const r of ringsOf(gameState, mySide)) delete h[r];
        h[selectedRing] = "selected";
        for (const to of movesFrom(gameState, selectedRing)) h[to] = "target";
      }
    } else if (phase === "REMOVE_ROW") {
      const windows = rowWindows(gameState, mySide);
      if (rowStart) {
        for (const [a, b] of windows) {
          if (a === rowStart) h[b] = "row";
          if (b === rowStart) h[a] = "row";
        }
        h[rowStart] = "rowStart";
      } else {
        for (const [a, b] of windows) {
          for (const c of windowCells(a, b)) h[c] = "row";
        }
      }
    } else if (phase === "REMOVE_RING") {
      for (const r of ringsOf(gameState, mySide)) h[r] = "removable";
    }
    return h;
  }, [gameState, isActive, mySide, selectedRing, rowStart]);

  const lobbyUID = `${lobbyId}`;
  const call = useCallback(async (fn: () => Promise<void>) => {
    setLoading(true);
    try {
      await fn();
    } finally {
      setLoading(false);
    }
  }, []);

  const handleClick = useCallback(
    (coord: Coord) => {
      if (!gameState || !isActive || loading || !mySide) return;
      const h = highlights[coord];
      switch (gameState.phase) {
        case "PLACE_RINGS":
          if (isEmpty(gameState, coord))
            void call(() => placeYinshRing({ lobbyUID, coord }));
          return;
        case "MOVE_RING":
          if (ringAt(gameState, coord) === mySide) {
            select(coord === selectedRing ? null : coord, null);
          } else if (h === "target" && selectedRing) {
            void call(() =>
              moveYinshRing({ lobbyUID, from: selectedRing, to: coord }),
            );
          }
          return;
        case "REMOVE_ROW": {
          const windows = rowWindows(gameState, mySide);
          if (rowStart) {
            const match = windows.find(
              ([a, b]) =>
                (a === rowStart && b === coord) ||
                (b === rowStart && a === coord),
            );
            if (match)
              void call(() =>
                removeYinshRow({ lobbyUID, from: match[0], to: match[1] }),
              );
            else select(null, null);
            return;
          }
          const containing = windows.filter(([a, b]) =>
            windowCells(a, b).includes(coord),
          );
          if (containing.length === 1) {
            void call(() =>
              removeYinshRow({
                lobbyUID,
                from: containing[0][0],
                to: containing[0][1],
              }),
            );
          } else if (containing.length > 1) {
            // Ambiguous: let the player name the other end of the five they want.
            const ends = windows.filter(([a, b]) => a === coord || b === coord);
            if (ends.length) select(null, coord);
            else if (containing[0])
              void call(() =>
                removeYinshRow({
                  lobbyUID,
                  from: containing[0][0],
                  to: containing[0][1],
                }),
              );
          }
          return;
        }
        case "REMOVE_RING":
          if (ringAt(gameState, coord) === mySide)
            void call(() => removeYinshRing({ lobbyUID, coord }));
          return;
      }
    },
    [
      gameState,
      isActive,
      loading,
      mySide,
      highlights,
      selectedRing,
      rowStart,
      lobbyUID,
      call,
      select,
    ],
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

  return (
    <>
      <Container fluid px="md" pt={44} pb="md">
        <Grid>
          <Grid.Col span={{ base: 12, md: 7 }}>
            <Stack gap="xs" align="center">
              <Group gap="sm" justify="center">
                <Badge variant="light" radius="sm" size="lg">
                  Turn {gameState.turn}
                </Badge>
                <Badge variant="light" color="gray" radius="sm" size="lg">
                  {gameState.pool} markers in the pool
                </Badge>
              </Group>
              <Board
                gameState={gameState}
                highlights={highlights}
                onClick={handleClick}
              />
            </Stack>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 5 }}>
            <Stack gap="sm">
              {gameState.players.map((player) => (
                <PlayerOverview
                  key={player.email}
                  player={player}
                  gameState={gameState}
                />
              ))}
            </Stack>
          </Grid.Col>
        </Grid>
      </Container>
      {loggedInPlayer && (
        <div
          className={
            isActive ? panelClasses.pageSpacer : panelClasses.pageSpacerCompact
          }
        />
      )}
      {loggedInPlayer && (
        <ActionPanel
          gameState={gameState}
          isActive={isActive}
          selected={selectedRing}
          rowStart={rowStart}
          loading={loading}
          onCancel={() => select(null, null)}
        />
      )}
    </>
  );
}
