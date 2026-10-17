import { Badge, Center, Container, Group, Loader, Stack } from "@mantine/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import useGameState from "../../shared/hooks/useGameState";
import { useUserContext } from "../../shared/context/useUserContext";
import useTurnAlert from "../../shared/hooks/useTurnAlert";
import useGameSounds from "../../shared/hooks/useGameSounds";
import useBotNudge from "../../shared/hooks/useBotNudge";
import { useLobbyContext } from "../../shared/context/useLobbyContext";
import TurnBanner from "../../shared/components/TurnBanner";
import { Colour, Coord, LyngkGameState } from "./types";
import Board, { Highlight } from "./components/Board";
import PlayerOverview from "./components/PlayerOverview";
import ActionPanel from "./components/ActionPanel";
import GameOver from "./components/GameOver";
import claimLyngkColour from "../client/claimLyngkColour";
import moveLyngkStack from "../client/moveLyngkStack";
import {
  applyClaim,
  applyMove,
  CLAIMS_PER_PLAYER,
  movableStacks,
  pathsFrom,
  unclaimedColours,
} from "./board";
import panelClasses from "./components/ActionPanel.module.css";
import tableClasses from "../../shared/table.module.css";

type Selection = { key: string; path: Coord[] };
type Optimistic = { version: string; state: LyngkGameState };

const versionOf = (s: LyngkGameState | null | undefined) =>
  s
    ? [
        s.turn,
        s.activePlayer,
        s.notification?.timestamp,
        Object.keys(s.stacks || {}).length,
        s.players
          .map((p) => `${p.scored}/${(p.colours || []).join("")}`)
          .join("|"),
      ].join(":")
    : "";

const OPTIMISTIC_TTL_MS = 8000;

export default function Game() {
  const { user, isSignedIn } = useUserContext();
  const { lobbyId } = useLobbyContext();
  const { gameState, isLoading } = useGameState<LyngkGameState>();
  const [selection, setSelection] = useState<Selection>({ key: "", path: [] });
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

  useTurnAlert(isActive && inProgress, "LYNGK");

  const phaseKey = `${gameState?.turn}:${gameState?.activePlayer}:${(loggedInPlayer?.colours || []).join("")}`;
  const path = useMemo(
    () => (selection.key === phaseKey ? selection.path : []),
    [selection, phaseKey],
  );
  const select = useCallback(
    (next: Coord[]) => setSelection({ key: phaseKey, path: next }),
    [phaseKey],
  );

  const me = loggedInPlayer?.email;

  /** Legal paths that begin with the chosen route so far. */
  const continuations = useMemo(() => {
    if (!gameState || !me || path.length === 0) return [];
    return pathsFrom(gameState, me, path[0]).filter(
      (p) => p.length > path.length && path.every((c, i) => p[i] === c),
    );
  }, [gameState, me, path]);

  const highlights = useMemo(() => {
    const h: { [coord: Coord]: Highlight } = {};
    if (!shown) return h;
    const lastPath = shown.lastMove?.path;
    if (lastPath?.length) h[lastPath[lastPath.length - 1]] = "last";
    if (!isActive || !me || pending) return h;
    if (path.length === 0) {
      for (const c of movableStacks(shown, me)) h[c] = "selectable";
      return h;
    }
    h[path[0]] = "selected";
    for (const c of path.slice(1)) h[c] = "path";
    for (const p of continuations) {
      const next = p[path.length];
      h[next] = p.length === path.length + 1 ? "target" : "link";
    }
    return h;
  }, [shown, isActive, me, pending, path, continuations]);

  const claimable: Colour[] = useMemo(() => {
    if (!gameState || !loggedInPlayer || !isActive || pending) return [];
    if (
      loggedInPlayer.claimedThisTurn ||
      (loggedInPlayer.colours?.length ?? 0) >= CLAIMS_PER_PLAYER
    )
      return [];
    return unclaimedColours(gameState);
  }, [gameState, loggedInPlayer, isActive, pending]);

  const lobbyUID = `${lobbyId}`;
  const call = useCallback(
    async (fn: () => Promise<boolean>, preview: LyngkGameState) => {
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

  const handleClaim = useCallback(
    (colour: Colour) => {
      if (!gameState || !me || pending) return;
      void call(
        () => claimLyngkColour({ lobbyUID, colour }),
        applyClaim(gameState, me, colour),
      );
    },
    [gameState, me, pending, lobbyUID, call],
  );

  const handleClick = useCallback(
    (coord: Coord) => {
      if (!gameState || !isActive || pending || !me) return;
      if (path.length === 0) {
        if (pathsFrom(gameState, me, coord).length > 0) select([coord]);
        return;
      }
      const h = highlights[coord];
      if (h === "target") {
        const full = [...path, coord];
        void call(
          () => moveLyngkStack({ lobbyUID, path: full }),
          applyMove(gameState, full),
        );
      } else if (h === "link") {
        select([...path, coord]);
      } else if (coord === path[0]) {
        select([]);
      } else if (
        pathsFrom(gameState, me, coord).length > 0 &&
        path.length === 1
      ) {
        select([coord]);
      } else {
        select([]);
      }
    },
    [
      gameState,
      isActive,
      pending,
      me,
      path,
      highlights,
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
          path={path}
          claimable={claimable}
          loading={pending}
          onClaim={handleClaim}
          onCancel={() => select([])}
        />
      )}
    </>
  );
}
