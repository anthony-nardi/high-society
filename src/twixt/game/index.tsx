import { Badge, Center, Container, Group, Loader, Stack } from "@mantine/core";
import { useCallback, useMemo, useState } from "react";
import useGameState from "../../shared/hooks/useGameState";
import { useUserContext } from "../../shared/context/useUserContext";
import useTurnAlert from "../../shared/hooks/useTurnAlert";
import useGameSounds from "../../shared/hooks/useGameSounds";
import useBotNudge from "../../shared/hooks/useBotNudge";
import { useLobbyContext } from "../../shared/context/useLobbyContext";
import TurnBanner from "../../shared/components/TurnBanner";
import { Link, TwixtGameState } from "./types";
import Board, { Highlight } from "./components/Board";
import PlayerOverview from "./components/PlayerOverview";
import ActionPanel from "./components/ActionPanel";
import GameOver from "./components/GameOver";
import placeTwixtPeg from "../client/placeTwixtPeg";
import swapTwixtSides from "../client/swapTwixtSides";
import removeTwixtLink from "../client/removeTwixtLink";
import { applyPlace, HOLES, placementProblem, swapAvailable } from "./board";
import panelClasses from "./components/ActionPanel.module.css";
import tableClasses from "../../shared/table.module.css";

/** A peg shown before the server confirms it lives this long at most. */
const OPTIMISTIC_TTL_MS = 8000;

export default function Game() {
  const { user, isSignedIn } = useUserContext();
  const { lobbyId } = useLobbyContext();
  const { gameState: serverState, isLoading } = useGameState<TwixtGameState>();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<{
    turn: number;
    at: number;
    state: TwixtGameState;
  } | null>(null);
  const [selection, setSelection] = useState<{
    key: string;
    link: Link | null;
  }>({ key: "", link: null });

  useGameSounds(serverState?.notification);
  useBotNudge(lobbyId, serverState);

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
  useTurnAlert(acting && inProgress, "TwixT");

  const turnKey = `${gameState?.turn}:${gameState?.activePlayer}`;
  const selectedLink = selection.key === turnKey ? selection.link : null;
  const select = useCallback(
    (link: Link | null) => setSelection({ key: turnKey, link }),
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

  const highlights = useMemo(() => {
    const h: { [hole: number]: Highlight } = {};
    if (!gameState || !me) return h;
    if (acting && !loading && inProgress) {
      for (let hole = 0; hole < HOLES; hole++)
        if (!placementProblem(gameState, me.side, hole)) h[hole] = "selectable";
    }
    return h;
  }, [gameState, me, acting, loading, inProgress]);

  const handleHole = useCallback(
    (hole: number) => {
      if (!gameState || !serverState || !me || !acting || loading) return;
      if (placementProblem(gameState, me.side, hole)) return;
      const at = Date.now();
      setPreview({
        turn: serverState.turn,
        at,
        state: applyPlace(gameState, me.side, hole, me.email),
      });
      window.setTimeout(
        () => setPreview((p) => (p && p.at === at ? null : p)),
        OPTIMISTIC_TTL_MS,
      );
      void call(async () => {
        const accepted = await placeTwixtPeg({ lobbyUID, hole });
        if (!accepted) setPreview(null);
      });
    },
    [gameState, serverState, me, acting, loading, call, lobbyUID],
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

  return (
    <>
      <TurnBanner active={acting && inProgress} />
      <Container fluid px="md" pt={44} pb="md">
        <div className={tableClasses.table}>
          <div className={tableClasses.players}>
            {gameState.players.map((player) => (
              <PlayerOverview
                key={player.email}
                player={player}
                gameState={gameState}
              />
            ))}
          </div>
          <div className={tableClasses.board} aria-busy={loading}>
            <Stack gap="xs" align="center">
              <Group gap="sm" justify="center" wrap="wrap">
                <Badge variant="light" radius="sm" size="lg">
                  Move {gameState.moves + 1}
                </Badge>
                {swapAvailable(gameState) && (
                  <Badge variant="light" color="orange" radius="sm" size="lg">
                    Swap on offer
                  </Badge>
                )}
              </Group>
              <Board
                gameState={gameState}
                highlights={highlights}
                mySide={me?.side}
                selectedLink={selectedLink || undefined}
                onHole={handleHole}
                onLink={acting && !loading ? (link) => select(link) : undefined}
              />
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
          loading={loading}
          selectedLink={selectedLink}
          onSwap={() => void call(() => swapTwixtSides({ lobbyUID }))}
          onRemoveLink={() => {
            if (!selectedLink) return;
            const link = selectedLink;
            select(null);
            void call(() => removeTwixtLink({ lobbyUID, link }));
          }}
          onCancel={() => select(null)}
        />
      )}
    </>
  );
}
