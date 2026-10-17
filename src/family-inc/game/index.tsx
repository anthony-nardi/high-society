import { Center, Container, Grid, Loader, Stack } from "@mantine/core";
import { useMemo } from "react";
import useGameState from "../../shared/hooks/useGameState";
import { useUserContext } from "../../shared/context/useUserContext";
import useTurnAlert from "../../shared/hooks/useTurnAlert";
import useGameSounds from "../../shared/hooks/useGameSounds";
import useBotNudge from "../../shared/hooks/useBotNudge";
import { FamilyIncGameState } from "./types";
import { useLobbyContext } from "../../shared/context/useLobbyContext";
import SharedBoard from "./components/SharedBoard";
import PlayerOverview from "./components/PlayerOverview";
import ActionPanel from "./components/ActionPanel";
import GameOver from "./components/GameOver";
import panelClasses from "./components/ActionPanel.module.css";

export default function Game() {
  const { user, isSignedIn } = useUserContext();
  const { lobbyId } = useLobbyContext();
  const { gameState, isLoading } = useGameState<FamilyIncGameState>();

  useGameSounds(gameState?.notification);
  useBotNudge(lobbyId, gameState);

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

  useTurnAlert(isActive && gameState?.status === "IN_PROGRESS", "Family Inc.");

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

  return (
    <>
      <Container fluid px="md" pt={44} pb="md">
        <Grid>
          <Grid.Col span={{ base: 12, md: 5 }}>
            <SharedBoard gameState={gameState} />
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
          player={loggedInPlayer}
          isActive={isActive}
        />
      )}
    </>
  );
}
