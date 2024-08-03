import { Box, Center, Container, Grid, Loader } from "@mantine/core";
import { useMemo } from "react";
import DeckOverview from "./components/DeckOverview";
import PlayerOverview from "./components/PlayerOverview";
import GameOver from "./components/GameOver";
import { useLobbyContext } from "../../shared/context/LobbyProvider";
import useGameState from "../../shared/hooks/useGameState";
import { useUserContext } from "../../shared/context/useUserContext";
import { useServerNotification } from "../../shared/hooks/useServerNotification";
import { GameState } from "./types";

export default function Game() {
  const { user, isSignedIn } = useUserContext();
  const { lobbyId } = useLobbyContext();
  const { gameState } = useGameState<GameState>();

  useServerNotification();

  const deckInfo = useMemo(() => {
    if (!gameState) {
      return null;
    }

    return {
      currentStatusCard: gameState.currentStatusCard,
      remainingCards: gameState.remainingCards,
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

  const highestBidTotal = useMemo(() => {
    if (!gameState || !gameState.players) {
      return 0;
    }

    let highestBid = 0;

    gameState.players.forEach((player) => {
      const totalAmountBid = (player.currentBid || []).reduce((sum, curr) => {
        return Number(sum) + Number(curr);
      }, 0);
      if (totalAmountBid > highestBid) {
        highestBid = totalAmountBid;
      }
    });

    return highestBid;
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
    return <GameOver lobbyId={lobbyId?.toString() as string} />;
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
                        highestBidTotal={highestBidTotal}
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
