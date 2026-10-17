import { Badge, Center, Container, Group, Loader, Stack } from "@mantine/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import useGameState from "../../shared/hooks/useGameState";
import { useUserContext } from "../../shared/context/useUserContext";
import useTurnAlert from "../../shared/hooks/useTurnAlert";
import useGameSounds from "../../shared/hooks/useGameSounds";
import useBotNudge from "../../shared/hooks/useBotNudge";
import { useLobbyContext } from "../../shared/context/useLobbyContext";
import TurnBanner from "../../shared/components/TurnBanner";
import { Coord, GipfGameState } from "./types";
import Board, { Highlight } from "./components/Board";
import PlayerOverview from "./components/PlayerOverview";
import ActionPanel from "./components/ActionPanel";
import GameOver from "./components/GameOver";
import pushGipfPiece from "../client/pushGipfPiece";
import removeGipfRow from "../client/removeGipfRow";
import {
  applyPush,
  applyRemoveRow,
  isDot,
  legalPushes,
  rowsFor,
  sideOf,
} from "./board";
import panelClasses from "./components/ActionPanel.module.css";
import tableClasses from "../../shared/table.module.css";

type Selection = { key: string; dot: Coord | null };
type Optimistic = { version: string; state: GipfGameState };

const versionOf = (s: GipfGameState | null | undefined) =>
  s
    ? [
        s.turn,
        s.phase,
        s.activePlayer,
        s.notification?.timestamp,
        Object.keys(s.pieces || {}).length,
        s.players.map((p) => p.reserve).join("/"),
      ].join(":")
    : "";

const OPTIMISTIC_TTL_MS = 8000;

export default function Game() {
  const { user, isSignedIn } = useUserContext();
  const { lobbyId } = useLobbyContext();
  const { gameState, isLoading } = useGameState<GipfGameState>();
  const [selection, setSelection] = useState<Selection>({ key: "", dot: null });
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

  useTurnAlert(isActive && inProgress, "GIPF");

  const phaseKey = `${gameState?.turn}:${gameState?.phase}:${gameState?.activePlayer}`;
  const selectedDot = selection.key === phaseKey ? selection.dot : null;
  const select = useCallback(
    (dot: Coord | null) => setSelection({ key: phaseKey, dot }),
    [phaseKey],
  );

  const mySide = gameState
    ? sideOf(gameState, loggedInPlayer?.email)
    : undefined;

  const highlights = useMemo(() => {
    const h: { [coord: Coord]: Highlight } = {};
    if (!shown) return h;
    if (shown.lastMove?.to) h[shown.lastMove.to] = "last";
    // Everyone sees the rows being chosen between.
    if (shown.phase === "REMOVE_ROW" && !pending) {
      const remover = shown.players.find(
        (p) => p.email === (shown.removing || shown.activePlayer),
      );
      if (remover)
        for (const row of rowsFor(shown, remover.side))
          for (const c of row.cells) h[c] = "row";
    }
    if (!isActive || !mySide || pending || shown.phase !== "MOVE") return h;
    const pushes = legalPushes(shown);
    if (selectedDot) {
      h[selectedDot] = "selectedDot";
      for (const [dot, to] of pushes) if (dot === selectedDot) h[to] = "target";
    } else {
      for (const [dot] of pushes) h[dot] = "dot";
    }
    return h;
  }, [shown, isActive, mySide, pending, selectedDot]);

  const lobbyUID = `${lobbyId}`;
  const call = useCallback(
    async (fn: () => Promise<boolean>, preview: GipfGameState) => {
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
      if (gameState.phase === "REMOVE_ROW") {
        const inRows = rowsFor(gameState, mySide).filter((r) =>
          r.cells.includes(coord),
        );
        if (inRows.length === 1) {
          void call(
            () => removeGipfRow({ lobbyUID, coord }),
            applyRemoveRow(gameState, coord, mySide),
          );
        }
        return;
      }
      if (isDot(coord)) {
        const canEnter = legalPushes(gameState).some(([dot]) => dot === coord);
        select(canEnter && coord !== selectedDot ? coord : null);
      } else if (h === "target" && selectedDot) {
        const dot = selectedDot;
        void call(
          () => pushGipfPiece({ lobbyUID, from: dot, to: coord }),
          applyPush(gameState, dot, coord, mySide),
        );
      } else {
        select(null);
      }
    },
    [
      gameState,
      isActive,
      pending,
      mySide,
      highlights,
      selectedDot,
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
                  {Object.keys(shown.pieces || {}).length} pieces on the board
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
          selectedDot={selectedDot}
          loading={pending}
          onCancel={() => select(null)}
        />
      )}
    </>
  );
}
