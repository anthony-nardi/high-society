import { Center, Container, Grid, Loader, Stack } from "@mantine/core";
import { useCallback, useMemo, useState } from "react";
import useGameState from "../../shared/hooks/useGameState";
import { useUserContext } from "../../shared/context/useUserContext";
import useTurnAlert from "../../shared/hooks/useTurnAlert";
import useGameSounds from "../../shared/hooks/useGameSounds";
import { LootCards, RazziaGameState } from "./types";
import { useLobbyContext } from "../../shared/context/useLobbyContext";
import SharedBoard from "./components/SharedBoard";
import PlayerOverview from "./components/PlayerOverview";
import ActionPanel from "./components/ActionPanel";
import GameOver from "./components/GameOver";
import panelClasses from "./components/ActionPanel.module.css";

export default function Game() {
  const { user, isSignedIn } = useUserContext();
  const { lobbyId } = useLobbyContext();
  const { gameState, isLoading } = useGameState<RazziaGameState>();

  useGameSounds(gameState?.notification);
  const [stealing, setStealing] = useState(false);
  const [stealIndexes, setStealIndexes] = useState<number[]>([]);

  const loggedInPlayer = useMemo(() => {
    if (!gameState || !user) return null;
    return (
      gameState.players.find((player) => player.email === user.email) || null
    );
  }, [gameState, user]);

  const isActive =
    !!gameState &&
    !!loggedInPlayer &&
    loggedInPlayer.email === gameState.activePlayer;

  useTurnAlert(isActive && gameState?.status === "IN_PROGRESS", "Razzia!");

  const loot = useMemo(
    () =>
      ((gameState?.revealedCards || []) as LootCards[]).filter(
        (card) => card !== "POLICE_RAIDS",
      ),
    [gameState],
  );
  const thieves = (loggedInPlayer?.cards?.theives || []).length;

  const toggleSteal = useCallback(
    (index: number) => {
      setStealIndexes((current) => {
        if (current.includes(index)) return current.filter((i) => i !== index);
        if (current.length >= thieves) return current;
        return [...current, index];
      });
    },
    [thieves],
  );

  const stopStealing = useCallback(() => {
    setStealing(false);
    setStealIndexes([]);
  }, []);

  const isGameActive =
    isSignedIn && gameState && gameState.status && lobbyId && user;
  const isGameOver = isGameActive && gameState?.status === "GAME_OVER";

  if (gameState === null) {
    return null;
  }

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

  // Stealing mode only makes sense while it is our action-phase turn.
  const stealMode = stealing && isActive && gameState.roundState === "ACTION";
  const stealSelection = stealIndexes.map((i) => loot[i]).filter(Boolean);

  return (
    <>
      <Container fluid px="md" pt={44} pb="md">
        <Grid>
          <Grid.Col span={{ base: 12, md: 5 }}>
            <SharedBoard
              gameState={gameState}
              selectable={stealMode}
              selected={stealMode ? stealIndexes : []}
              onToggle={toggleSteal}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 7 }}>
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
      {loggedInPlayer && <div className={panelClasses.pageSpacer} />}
      {loggedInPlayer && (
        <ActionPanel
          gameState={gameState}
          player={loggedInPlayer}
          isActive={isActive}
          stealing={stealMode}
          stealSelection={stealSelection}
          onStartStealing={() => setStealing(true)}
          onCancelStealing={stopStealing}
        />
      )}
    </>
  );
}
