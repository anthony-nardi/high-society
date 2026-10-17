import { Badge, Center, Container, Group, Loader, Stack } from "@mantine/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import useGameState from "../../shared/hooks/useGameState";
import { useUserContext } from "../../shared/context/useUserContext";
import useTurnAlert from "../../shared/hooks/useTurnAlert";
import useGameSounds from "../../shared/hooks/useGameSounds";
import useBotNudge from "../../shared/hooks/useBotNudge";
import { useLobbyContext } from "../../shared/context/useLobbyContext";
import TurnBanner from "../../shared/components/TurnBanner";
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
  applyMoveRing,
  applyPlaceRing,
  applyRemoveRing,
  applyRemoveRow,
  isEmpty,
  movesFrom,
  ringAt,
  ringsOf,
  rowWindows,
  sideOf,
  windowCells,
} from "./board";
import panelClasses from "./components/ActionPanel.module.css";
import tableClasses from "../../shared/table.module.css";

type Selection = { key: string; ring: Coord | null; rowStart: Coord | null };

/** A preview of a move, valid only against the server state it was made from. */
type Optimistic = { version: string; state: YinshGameState };

/** Anything the server changes after a move changes this. */
const versionOf = (s: YinshGameState | null | undefined) =>
  s
    ? [
        s.turn,
        s.phase,
        s.activePlayer,
        s.pool,
        s.notification?.timestamp,
        Object.keys(s.rings || {}).length,
        Object.keys(s.markers || {}).length,
      ].join(":")
    : "";

/** How long a preview may outlive its call before the server state wins. */
const OPTIMISTIC_TTL_MS = 8000;

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
  const [optimistic, setOptimistic] = useState<Optimistic | null>(null);

  useGameSounds(gameState?.notification);
  useBotNudge(lobbyId, gameState);

  const serverVersion = versionOf(gameState);
  const shown =
    optimistic && optimistic.version === serverVersion && gameState
      ? optimistic.state
      : gameState;
  const pending = loading || (!!shown && shown !== gameState);

  // A preview that the server never answered is dropped after a while.
  useEffect(() => {
    if (!optimistic) return;
    const timer = window.setTimeout(
      () => setOptimistic((o) => (o === optimistic ? null : o)),
      OPTIMISTIC_TTL_MS,
    );
    return () => window.clearTimeout(timer);
  }, [optimistic]);

  const loggedInPlayer = useMemo(() => {
    if (!gameState || !user) return null;
    return gameState.players.find((p) => p.email === user.email) || null;
  }, [gameState, user]);

  const isActive =
    !!gameState &&
    !!loggedInPlayer &&
    loggedInPlayer.email === gameState.activePlayer;
  const inProgress = gameState?.status === "IN_PROGRESS";

  useTurnAlert(isActive && inProgress, "YINSH");

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
    if (!shown || !gameState) return h;
    if (shown.lastMove?.from) h[shown.lastMove.from] = "last";
    if (shown.lastMove?.to) h[shown.lastMove.to] = "last";
    const phase = shown.phase;
    // Everyone sees a completed row breathe while it is being taken.
    if (phase === "REMOVE_ROW" && !pending) {
      const remover = shown.players.find(
        (p) => p.email === (shown.removing || shown.activePlayer),
      );
      if (remover) {
        for (const [a, b] of rowWindows(shown, remover.side)) {
          for (const c of windowCells(a, b)) h[c] = "row";
        }
      }
    }
    if (!isActive || !mySide || pending) return h;
    if (phase === "MOVE_RING") {
      for (const r of ringsOf(shown, mySide)) h[r] = "selected";
      if (selectedRing) {
        for (const r of ringsOf(shown, mySide)) delete h[r];
        h[selectedRing] = "selected";
        for (const to of movesFrom(shown, selectedRing)) h[to] = "target";
      }
    } else if (phase === "REMOVE_ROW" && rowStart) {
      const windows = rowWindows(shown, mySide);
      for (const c of Object.keys(h)) if (h[c] === "row") delete h[c];
      for (const [a, b] of windows) {
        if (a === rowStart) h[b] = "row";
        if (b === rowStart) h[a] = "row";
      }
      h[rowStart] = "rowStart";
    } else if (phase === "REMOVE_RING") {
      for (const r of ringsOf(shown, mySide)) h[r] = "removable";
    }
    return h;
  }, [shown, gameState, isActive, mySide, pending, selectedRing, rowStart]);

  const lobbyUID = `${lobbyId}`;
  const call = useCallback(
    async (fn: () => Promise<boolean>, preview: YinshGameState) => {
      const version = serverVersion;
      setOptimistic({ version, state: preview });
      setLoading(true);
      let accepted = false;
      try {
        accepted = await fn();
      } finally {
        setLoading(false);
        if (!accepted) setOptimistic(null);
      }
    },
    [serverVersion],
  );

  const handleClick = useCallback(
    (coord: Coord) => {
      if (!gameState || !isActive || pending || !mySide) return;
      const h = highlights[coord];
      switch (gameState.phase) {
        case "PLACE_RINGS":
          if (isEmpty(gameState, coord)) {
            void call(
              () => placeYinshRing({ lobbyUID, coord }),
              applyPlaceRing(gameState, coord, mySide),
            );
          }
          return;
        case "MOVE_RING":
          if (ringAt(gameState, coord) === mySide) {
            select(coord === selectedRing ? null : coord, null);
          } else if (h === "target" && selectedRing) {
            void call(
              () => moveYinshRing({ lobbyUID, from: selectedRing, to: coord }),
              applyMoveRing(gameState, selectedRing, coord),
            );
          } else {
            // Tapping anywhere else puts the ring back.
            select(null, null);
          }
          return;
        case "REMOVE_ROW": {
          const windows = rowWindows(gameState, mySide);
          const take = ([from, to]: [Coord, Coord]) =>
            call(
              () => removeYinshRow({ lobbyUID, from, to }),
              applyRemoveRow(gameState, from, to, mySide),
            );
          if (rowStart) {
            const match = windows.find(
              ([a, b]) =>
                (a === rowStart && b === coord) ||
                (b === rowStart && a === coord),
            );
            if (match) void take(match);
            else select(null, null);
            return;
          }
          const containing = windows.filter(([a, b]) =>
            windowCells(a, b).includes(coord),
          );
          if (containing.length === 1) {
            void take(containing[0]);
          } else if (containing.length > 1) {
            // Ambiguous: let the player name the other end of the five they want.
            const ends = windows.filter(([a, b]) => a === coord || b === coord);
            if (ends.length) select(null, coord);
            else void take(containing[0]);
          }
          return;
        }
        case "REMOVE_RING":
          if (ringAt(gameState, coord) === mySide) {
            void call(
              () => removeYinshRing({ lobbyUID, coord }),
              applyRemoveRing(gameState, coord),
            );
          }
          return;
      }
    },
    [
      gameState,
      isActive,
      pending,
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

  if (gameState === null || !shown) return null;
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
      <TurnBanner active={isActive && inProgress} />
      <Container fluid px="md" pt={44} pb="md">
        <div className={tableClasses.table}>
          <div className={tableClasses.players}>
            {shown.players.map((player) => (
              <PlayerOverview
                key={player.email}
                player={player}
                gameState={shown}
              />
            ))}
          </div>
          <div
            className={`${tableClasses.board} ${pending ? tableClasses.boardPending : ""}`}
            aria-busy={pending}
          >
            <Stack gap="xs" align="center">
              <Group gap="sm" justify="center">
                <Badge variant="light" radius="sm" size="lg">
                  Turn {shown.turn}
                </Badge>
                <Badge variant="light" color="gray" radius="sm" size="lg">
                  {shown.pool} markers in the pool
                </Badge>
              </Group>
              <Board
                gameState={shown}
                highlights={highlights}
                onClick={isActive && !pending ? handleClick : undefined}
              />
            </Stack>
          </div>
        </div>
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
          gameState={shown}
          isActive={isActive}
          selected={selectedRing}
          rowStart={rowStart}
          loading={pending}
          onCancel={() => select(null, null)}
        />
      )}
    </>
  );
}
