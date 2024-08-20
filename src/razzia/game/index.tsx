import {
  Box,
  Center,
  Container,
  Grid,
  Loader,
  SimpleGrid,
} from "@mantine/core";
import { useMemo } from "react";
import useGameState from "../../shared/hooks/useGameState";
import { useUserContext } from "../../shared/context/useUserContext";
import { useServerNotification } from "../../shared/hooks/useServerNotification";
import { RazziaGameState } from "./types";
import { useLobbyContext } from "../../shared/context/useLobbyContext.tsx";

export default function Game() {
  const { user, isSignedIn } = useUserContext();
  const { lobbyId } = useLobbyContext();
  const { gameState, isLoading } = useGameState<RazziaGameState>();

  useServerNotification();

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

  const isGameActive = useMemo(() => {
    return isSignedIn && gameState && gameState.status && lobbyId && user;
  }, [gameState, isSignedIn, lobbyId, user]);

  const isGameOver = useMemo(() => {
    return isGameActive && gameState?.status === "GAME_OVER";
  }, [gameState?.status, isGameActive]);

  if (gameState === null) {
    return null;
  }

  console.log(gameState);

  if (isLoading) {
    return (
      <Center>
        <Loader />
      </Center>
    );
  }

  if (isGameOver) {
    return "game over";
  }

  return (
    <>
      <Container fluid my="xl">
        <Grid gutter={{ base: 5, xs: "md", md: "xl", xl: 50 }}>
          <Grid.Col
            span={{ base: 12, md: 4 }}
            style={{ border: "1px solid red" }}
          >
            1
          </Grid.Col>
          <Grid.Col
            span={{ base: 12, md: 4 }}
            style={{ border: "1px solid red" }}
          >
            1
          </Grid.Col>
          <Grid.Col
            span={{ base: 12, md: 4 }}
            style={{ border: "1px solid red" }}
          >
            1
          </Grid.Col>
          <Grid.Col span={12} style={{ border: "1px solid red" }}>
            1
          </Grid.Col>
          <Grid.Col
            span={{ base: 12, md: 4 }}
            style={{ border: "1px solid red" }}
          >
            1
          </Grid.Col>
          <Grid.Col
            span={{ base: 12, md: 8 }}
            style={{ border: "1px solid red" }}
          >
            2
          </Grid.Col>
        </Grid>
      </Container>
    </>
  );
}
