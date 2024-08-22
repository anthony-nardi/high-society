import { Center, Container, Loader } from "@mantine/core";
import { useMemo } from "react";
import useGameState from "../../shared/hooks/useGameState";
import { useUserContext } from "../../shared/context/useUserContext";
import { useServerNotification } from "../../shared/hooks/useServerNotification";
import { RazziaGameState } from "./types";
import { useLobbyContext } from "../../shared/context/useLobbyContext";
import ThreePlayerLayout from "./components/board-layout/ThreePlayerLayout";
import FourPlayerLayout from "./components/board-layout/FourPlayerLayout";
import FivePlayerLayout from "./components/board-layout/FivePlayerLayout";

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

  const layout = useMemo(() => {
    if (playerInfo.length === 3) {
      return (
        <ThreePlayerLayout players={playerInfo} activePlayer={activePlayer} />
      );
    }

    if (playerInfo.length === 4) {
      return (
        <FourPlayerLayout players={playerInfo} activePlayer={activePlayer} />
      );
    }

    if (playerInfo.length === 5) {
      return (
        <FivePlayerLayout players={playerInfo} activePlayer={activePlayer} />
      );
    }

    return null;
  }, [playerInfo, activePlayer]);

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
    return "game over";
  }

  return (
    <>
      <Container fluid my="xl">
        {layout}
      </Container>
    </>
  );
}
