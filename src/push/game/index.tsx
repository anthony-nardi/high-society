import { Center, Container, Loader, Stack } from "@mantine/core";
import { useCallback, useMemo, useState } from "react";
import useGameState from "../../shared/hooks/useGameState";
import { useUserContext } from "../../shared/context/useUserContext";
import useTurnAlert from "../../shared/hooks/useTurnAlert";
import useGameSounds from "../../shared/hooks/useGameSounds";
import useBotNudge from "../../shared/hooks/useBotNudge";
import { useLobbyContext } from "../../shared/context/useLobbyContext";
import TurnBanner from "../../shared/components/TurnBanner";
import type { Colour, PushGameState } from "./types";
import Table, { ColumnMode } from "./components/Table";
import PlayerOverview from "./components/PlayerOverview";
import ActionPanel from "./components/ActionPanel";
import RollMoment from "./components/RollMoment";
import GameOver from "./components/GameOver";
import {
  bankPushColour,
  drawPushCard,
  placePushCard,
  takePushColumn,
} from "../client/pushActions";
import panelClasses from "./components/ActionPanel.module.css";
import classes from "./push.module.css";
import tableClasses from "../../shared/table.module.css";

export default function Game() {
  const { user, isSignedIn } = useUserContext();
  const { lobbyId } = useLobbyContext();
  const { gameState, isLoading } = useGameState<PushGameState>();
  const [loading, setLoading] = useState(false);

  useGameSounds(gameState?.notification);
  useBotNudge(lobbyId, gameState);

  const me = useMemo(() => {
    if (!gameState || !user) return null;
    return gameState.players.find((p) => p.email === user.email) || null;
  }, [gameState, user]);

  const inProgress = gameState?.status === "IN_PROGRESS";
  const isActive =
    !!gameState && !!me && inProgress && me.email === gameState.activePlayer;
  useTurnAlert(isActive, "PUSH");

  const lobbyUID = `${lobbyId}`;
  const call = useCallback(async (fn: () => Promise<unknown>) => {
    setLoading(true);
    try {
      await fn();
    } finally {
      setLoading(false);
    }
  }, []);

  const mode: ColumnMode = useMemo(() => {
    if (!isActive || loading || !gameState) return null;
    if (gameState.phase === "CHOOSE") return "take";
    if (gameState.pending) return "place";
    return (gameState.columns || []).length ? "take" : null;
  }, [isActive, loading, gameState]);

  const onColumn = useCallback(
    (column: number) => {
      if (mode === "place")
        void call(() => placePushCard({ lobbyUID, column }));
      else if (mode === "take")
        void call(() => takePushColumn({ lobbyUID, column }));
    },
    [mode, call, lobbyUID],
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
      <TurnBanner active={isActive} />
      <RollMoment gameState={gameState} me={user?.email} />
      <Container fluid px="md" pt={44} pb="md">
        <div className={tableClasses.table}>
          <div
            className={`${tableClasses.board} ${loading ? tableClasses.boardPending : ""}`}
            style={{ order: 1 }}
            aria-busy={loading}
          >
            <Stack gap="md" align="center">
              <Table
                gameState={gameState}
                me={user?.email}
                mode={mode}
                onColumn={onColumn}
              />
            </Stack>
          </div>
          <div
            className={tableClasses.players}
            style={{ order: 2, gridTemplateColumns: "1fr", minWidth: 0 }}
          >
            <div className={classes.players}>
              {gameState.players.map((player) => (
                <PlayerOverview
                  key={player.email}
                  player={player}
                  gameState={gameState}
                  me={user?.email}
                />
              ))}
            </div>
          </div>
        </div>
      </Container>
      {me && (
        <div
          className={
            isActive ? panelClasses.pageSpacer : panelClasses.pageSpacerCompact
          }
        />
      )}
      {me && (
        <ActionPanel
          gameState={gameState}
          player={me}
          loading={loading}
          onDraw={() => void call(() => drawPushCard({ lobbyUID }))}
          onBank={(colour: Colour) =>
            void call(() => bankPushColour({ lobbyUID, colour }))
          }
        />
      )}
    </>
  );
}
