import { Box, Center, Container, Grid, Loader } from "@mantine/core";
import { useMemo } from "react";
import DeckOverview from "./components/DeckOverview";
import PlayerOverview from "./components/PlayerOverview";
import GameOver from "./components/GameOver";
import useGameState from "../../shared/hooks/useGameState";
import { useUserContext } from "../../shared/context/useUserContext";
import { useServerNotification } from "../../shared/hooks/useServerNotification";
import { HighSocietyGameState } from "./types";
import { useLobbyContext } from "../../shared/context/useLobbyContext";

export default function Game() {
  const { user, isSignedIn } = useUserContext();
  const { lobbyId } = useLobbyContext();
  const { gameState, isLoading } = useGameState<HighSocietyGameState>();

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

  const isGameActive = useMemo(() => {
    return isSignedIn && gameState && gameState.status && lobbyId && user;
  }, [gameState, isSignedIn, lobbyId, user]);

  const isGameOver = useMemo(() => {
    return isGameActive && gameState?.status === "GAME_OVER";
  }, [gameState?.status, isGameActive]);

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
    return <GameOver lobbyId={lobbyId?.toString() as string} />;
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
