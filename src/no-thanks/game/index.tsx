import { Center, Container, Grid, Loader, Stack } from "@mantine/core";
import { useMemo } from "react";
import DeckOverview from "./components/DeckOverview";
import PlayerOverview from "./components/PlayerOverview";
import GameOver from "./components/GameOver";
import ActionPanel from "./components/ActionPanel";
import useGameState from "../../shared/hooks/useGameState";
import { useUserContext } from "../../shared/context/useUserContext";
import useTurnAlert from "../../shared/hooks/useTurnAlert";
import TurnBanner from "../../shared/components/TurnBanner";
import useGameSounds from "../../shared/hooks/useGameSounds";
import useBotNudge from "../../shared/hooks/useBotNudge";
import { NoThanksGameState } from "./types";
import { useLobbyContext } from "../../shared/context/useLobbyContext";
import panelClasses from "./components/ActionPanel.module.css";

export default function Game() {
  const { user, isSignedIn } = useUserContext();
  const { lobbyId } = useLobbyContext();
  const { gameState, isLoading } = useGameState<NoThanksGameState>();

  useGameSounds(gameState?.notification);
  useBotNudge(lobbyId, gameState);

  const loggedInPlayer = useMemo(() => {
    if (!gameState || !user) {
      return null;
    }
    return (
      gameState.players.find((player) => player.email === user.email) || null
    );
  }, [gameState, user]);

  const isActive =
    !!gameState &&
    !!loggedInPlayer &&
    loggedInPlayer.email === gameState.activePlayer;

  useTurnAlert(isActive && gameState?.status === "IN_PROGRESS", "No Thanks!");

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
    return (
      <GameOver gameState={gameState} lobbyId={lobbyId?.toString() as string} />
    );
  }

  const deckInfo = {
    activeCard: gameState.activeCard ?? 0,
    remainingCards: gameState.remainingCards,
    chipsPlaced: gameState.chipsPlaced,
  };

  return (
    <>
      <TurnBanner active={isActive} />
      <Container fluid px="md" pt={44} pb="md">
        <Grid>
          <Grid.Col span={{ base: 12, md: 5 }}>
            <Center>
              <DeckOverview deckInfo={deckInfo} />
            </Center>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 7 }}>
            <Stack gap="sm">
              {gameState.players.map((player) => (
                <PlayerOverview
                  key={player.email}
                  player={player}
                  activePlayer={gameState.activePlayer}
                />
              ))}
            </Stack>
          </Grid.Col>
        </Grid>
      </Container>
      {loggedInPlayer && <div className={panelClasses.pageSpacer} />}
      {loggedInPlayer && (
        <ActionPanel
          isActive={isActive}
          activePlayer={gameState.activePlayer}
          activeCard={gameState.activeCard ?? 0}
          chipsPlaced={gameState.chipsPlaced || 0}
          cards={loggedInPlayer.cards || []}
          chips={loggedInPlayer.chips || 0}
        />
      )}
    </>
  );
}
