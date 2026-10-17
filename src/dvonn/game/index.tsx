import { Badge, Center, Container, Group, Loader, Stack } from "@mantine/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import useGameState from "../../shared/hooks/useGameState";
import { useUserContext } from "../../shared/context/useUserContext";
import useTurnAlert from "../../shared/hooks/useTurnAlert";
import useGameSounds from "../../shared/hooks/useGameSounds";
import useBotNudge from "../../shared/hooks/useBotNudge";
import { useLobbyContext } from "../../shared/context/useLobbyContext";
import TurnBanner from "../../shared/components/TurnBanner";
import { Coord, DvonnGameState } from "./types";
import Board, { Highlight } from "./components/Board";
import PlayerOverview from "./components/PlayerOverview";
import ActionPanel from "./components/ActionPanel";
import GameOver from "./components/GameOver";
import placeDvonnPiece from "../client/placeDvonnPiece";
import moveDvonnStack from "../client/moveDvonnStack";
import {
  applyMove,
  applyPlace,
  isEmpty,
  movableStacks,
  movesFrom,
  sideOf,
  topOf,
} from "./board";
import panelClasses from "./components/ActionPanel.module.css";
import tableClasses from "../../shared/table.module.css";

type Selection = { key: string; from: Coord | null };

/** A preview of a move, valid only against the server state it was made from. */
type Optimistic = { version: string; state: DvonnGameState };

/** Anything the server changes after a move changes this. */
const versionOf = (s: DvonnGameState | null | undefined) =>
  s
    ? [
        s.turn,
        s.phase,
        s.activePlayer,
        s.notification?.timestamp,
        Object.keys(s.stacks || {}).length,
      ].join(":")
    : "";

const OPTIMISTIC_TTL_MS = 8000;

export default function Game() {
  const { user, isSignedIn } = useUserContext();
  const { lobbyId } = useLobbyContext();
  const { gameState, isLoading } = useGameState<DvonnGameState>();
  const [selection, setSelection] = useState<Selection>({
    key: "",
    from: null,
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

  useTurnAlert(isActive && inProgress, "DVONN");

  const phaseKey = `${gameState?.turn}:${gameState?.phase}:${gameState?.activePlayer}`;
  const selected = selection.key === phaseKey ? selection.from : null;
  const select = useCallback(
    (from: Coord | null) => setSelection({ key: phaseKey, from }),
    [phaseKey],
  );

  const mySide = gameState
    ? sideOf(gameState, loggedInPlayer?.email)
    : undefined;

  const highlights = useMemo(() => {
    const h: { [coord: Coord]: Highlight } = {};
    if (!shown) return h;
    if (shown.lastMove?.from) h[shown.lastMove.from] = "last";
    if (shown.lastMove?.to) h[shown.lastMove.to] = "last";
    if (shown.lastMove?.placed) h[shown.lastMove.placed] = "last";
    if (!isActive || !mySide || pending || shown.phase !== "MOVE") return h;
    for (const c of movableStacks(shown, mySide)) h[c] = "selectable";
    if (selected) {
      for (const c of movableStacks(shown, mySide)) delete h[c];
      h[selected] = "selected";
      for (const to of movesFrom(shown, selected)) h[to] = "target";
    }
    return h;
  }, [shown, isActive, mySide, pending, selected]);

  const lobbyUID = `${lobbyId}`;
  const call = useCallback(
    async (fn: () => Promise<boolean>, preview: DvonnGameState) => {
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
      if (!gameState || !isActive || pending || !mySide || !loggedInPlayer)
        return;
      if (gameState.phase === "PLACE") {
        if (isEmpty(gameState, coord)) {
          const piece = loggedInPlayer.dvonn > 0 ? "DVONN" : mySide;
          void call(
            () => placeDvonnPiece({ lobbyUID, coord }),
            applyPlace(gameState, coord, piece),
          );
        }
        return;
      }
      const h = highlights[coord];
      if (
        topOf(gameState, coord) === mySide &&
        movesFrom(gameState, coord).length > 0
      ) {
        select(coord === selected ? null : coord);
      } else if (h === "target" && selected) {
        void call(
          () => moveDvonnStack({ lobbyUID, from: selected, to: coord }),
          applyMove(gameState, selected, coord),
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
      loggedInPlayer,
      highlights,
      selected,
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

  const placed = Object.values(shown.stacks || {}).reduce(
    (s, st) => s + st.length,
    0,
  );

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
                  {shown.phase === "PLACE"
                    ? `Placing ${placed} of 49`
                    : `Turn ${shown.turn}`}
                </Badge>
                <Badge variant="light" color="gray" radius="sm" size="lg">
                  {Object.keys(shown.stacks || {}).length} stacks on the board
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
          selected={selected}
          loading={pending}
          onCancel={() => select(null)}
        />
      )}
    </>
  );
}
