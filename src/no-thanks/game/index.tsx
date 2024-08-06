import { Box, Center, Container, Grid, Loader } from "@mantine/core";
import { useMemo } from "react";
import DeckOverview from "./components/DeckOverview";
import PlayerOverview from "./components/PlayerOverview";
import GameOver from "./components/GameOver.tsx";
import useGameState from "../../shared/hooks/useGameState";
import { useUserContext } from "../../shared/context/useUserContext";
import { useServerNotification } from "../../shared/hooks/useServerNotification";
import { NoThanksGameState } from "./types";
import { useLobbyContext } from "../../shared/context/useLobbyContext.tsx";

export default function Game() {
  const { user, isSignedIn } = useUserContext();
  const { lobbyId } = useLobbyContext();
  const { gameState } = useGameState<NoThanksGameState>();

  useServerNotification();

  const deckInfo = useMemo(() => {
    if (!gameState) {
      return null;
    }

    return {
      activeCard: gameState.activeCard,
      remainingCards: gameState.remainingCards,
      chipsPlaced: gameState.chipsPlaced,
    };
  }, [gameState]);

  const playerInfo = useMemo(() => {
    if (!gameState) {
      return [];
    }

    return gameState.players;
  }, [gameState]);

  const activePlayer = useMemo(() => {
    if (!gameState) {
      return "";
    }

    return gameState.activePlayer;
  }, [gameState]);

  const isInLobby = useMemo(() => {
    return isSignedIn && !gameState;
  }, [gameState, isSignedIn]);

  const isGameActive = useMemo(() => {
    return isSignedIn && gameState && gameState.status && lobbyId && user;
  }, [gameState, isSignedIn, lobbyId, user]);

  const isGameOver = useMemo(() => {
    return isGameActive && gameState?.status === "GAME_OVER";
  }, [gameState?.status, isGameActive]);

  const isGameInProgress = useMemo(() => {
    return isGameActive && gameState?.status === "IN_PROGRESS";
  }, [gameState?.status, isGameActive]);

  if (!isGameInProgress) {
    return null;
  }

  if (!isInLobby && gameState === null) {
    return (
      <Center>
        <Loader />
      </Center>
    );
  }

  if (isGameOver) {
    return <GameOver />;
  }

  if (!gameState) {
    return <>No game data...</>;
  }

  return (
    <>
      <Container fluid my="xl">
        <Grid>
          <Grid.Col span={5}>
            <Center>
              <Box>
                <DeckOverview deckInfo={deckInfo} />
              </Box>
            </Center>
          </Grid.Col>
          <Grid.Col span="auto">
            <Grid>
              {playerInfo.map((player) => {
                return (
                  <Grid.Col span={12} key={player.email}>
                    <Box>
                      <PlayerOverview
                        player={player}
                        activePlayer={activePlayer}
                      />
                    </Box>
                  </Grid.Col>
                );
              })}
            </Grid>
          </Grid.Col>
        </Grid>
      </Container>
    </>
  );
}
