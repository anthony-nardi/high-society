import { Center, Container, Loader, Stack } from "@mantine/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useGameState from "../../shared/hooks/useGameState";
import { useUserContext } from "../../shared/context/useUserContext";
import useTurnAlert from "../../shared/hooks/useTurnAlert";
import useGameSounds from "../../shared/hooks/useGameSounds";
import useBotNudge from "../../shared/hooks/useBotNudge";
import { useLobbyContext } from "../../shared/context/useLobbyContext";
import TurnBanner from "../../shared/components/TurnBanner";
import { playSound } from "../../shared/sound";
import { FujiFlushGameState } from "./types";
import Table from "./components/Table";
import PlayerOverview from "./components/PlayerOverview";
import ActionPanel from "./components/ActionPanel";
import GameOver from "./components/GameOver";
import playFujiCard from "../client/playFujiCard";
import panelClasses from "./components/ActionPanel.module.css";
import classes from "./fuji.module.css";

export default function Game() {
  const { user, isSignedIn } = useUserContext();
  const { lobbyId } = useLobbyContext();
  const { gameState, isLoading } = useGameState<FujiFlushGameState>();
  const [loading, setLoading] = useState(false);

  useGameSounds(gameState?.notification);
  useBotNudge(lobbyId, gameState);

  // A push has no notification of its own: it rides along with the next play.
  const pushKey = gameState?.lastPush
    ? `${gameState.lastPush.turn}:${gameState.lastPush.email}`
    : null;
  const inProgress = gameState?.status === "IN_PROGRESS";
  const seenPush = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (seenPush.current === undefined) {
      seenPush.current = pushKey;
      return;
    }
    if (pushKey && pushKey !== seenPush.current && inProgress) {
      const timer = setTimeout(() => playSound("win"), 350);
      seenPush.current = pushKey;
      return () => clearTimeout(timer);
    }
    seenPush.current = pushKey;
  }, [pushKey, inProgress]);

  const loggedInPlayer = useMemo(() => {
    if (!gameState || !user) return null;
    return gameState.players.find((p) => p.email === user.email) || null;
  }, [gameState, user]);

  const isActive =
    !!gameState &&
    !!loggedInPlayer &&
    loggedInPlayer.email === gameState.activePlayer;

  useTurnAlert(isActive && gameState?.status === "IN_PROGRESS", "Fuji Flush");

  const lobbyUID = `${lobbyId}`;
  const call = useCallback(async (fn: () => Promise<unknown>) => {
    setLoading(true);
    try {
      await fn();
    } finally {
      setLoading(false);
    }
  }, []);

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

  const hasHand = (loggedInPlayer?.hand || []).length > 0;

  return (
    <>
      <TurnBanner active={isActive} />
      <Container fluid px="md" pt={44} pb="md">
        <Stack gap="md">
          <Table gameState={gameState} me={user?.email} />
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
        </Stack>
      </Container>
      {loggedInPlayer && (
        <div
          className={
            isActive
              ? panelClasses.pageSpacer
              : hasHand
                ? panelClasses.pageSpacerHand
                : panelClasses.pageSpacerCompact
          }
        />
      )}
      {loggedInPlayer && (
        <ActionPanel
          gameState={gameState}
          player={loggedInPlayer}
          isActive={isActive}
          loading={loading}
          onPlay={(card) => void call(() => playFujiCard({ lobbyUID, card }))}
        />
      )}
    </>
  );
}
