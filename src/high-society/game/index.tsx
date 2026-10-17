import { Center, Container, Grid, Loader, Stack } from "@mantine/core";
import { useMemo } from "react";
import DeckOverview from "./components/DeckOverview";
import PlayerOverview from "./components/PlayerOverview";
import GameOver from "./components/GameOver";
import useGameState from "../../shared/hooks/useGameState";
import { useUserContext } from "../../shared/context/useUserContext";
import { HighSocietyGameState, HighSocietyPlayerState } from "./types";
import { useLobbyContext } from "../../shared/context/useLobbyContext";
import BidPanel from "./components/BidPanel";
import useBidding from "./hooks/useBidding";
import useTurnAlert from "../../shared/hooks/useTurnAlert";
import useGameSounds from "../../shared/hooks/useGameSounds";
import useBotNudge from "../../shared/hooks/useBotNudge";
import { greenCardsRevealed } from "./cardInfo";
import panelClasses from "./components/BidPanel.module.css";

export default function Game() {
  const { user, isSignedIn } = useUserContext();
  const { lobbyId } = useLobbyContext();
  const { gameState, isLoading } = useGameState<HighSocietyGameState>();

  useGameSounds(gameState?.notification);
  useBotNudge(lobbyId, gameState);

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

  const greenRevealed = useMemo(() => {
    if (!gameState) {
      return 0;
    }
    return greenCardsRevealed(gameState.players, gameState.currentStatusCard);
  }, [gameState]);

  const loggedInPlayer = useMemo(() => {
    if (!gameState || !user) {
      return null;
    }

    return (
      gameState.players.find((player) => player.email === user.email) || null
    );
  }, [gameState, user]);

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
    <ActiveGame
      deckInfo={deckInfo}
      playerInfo={playerInfo}
      activePlayer={activePlayer}
      highestBidTotal={highestBidTotal}
      greenRevealed={greenRevealed}
      loggedInPlayer={loggedInPlayer}
    />
  );
}

function ActiveGame({
  deckInfo,
  playerInfo,
  activePlayer,
  highestBidTotal,
  greenRevealed,
  loggedInPlayer,
}: {
  deckInfo: {
    currentStatusCard: HighSocietyGameState["currentStatusCard"];
    remainingCards: HighSocietyGameState["remainingCards"];
  } | null;
  playerInfo: HighSocietyPlayerState[];
  activePlayer: string;
  highestBidTotal: number;
  greenRevealed: number;
  loggedInPlayer: HighSocietyPlayerState | null;
}) {
  const isActive = !!loggedInPlayer && loggedInPlayer.email === activePlayer;
  const bidding = useBidding({
    player: loggedInPlayer || {
      email: "",
      lastActionAt: 0,
      moneyCards: [],
      hasPassed: false,
      isBot: false,
    },
    isActive,
    highestBidTotal,
  });

  useTurnAlert(isActive, "High Society");

  return (
    <>
      <Container fluid px="md" pt={44} pb="md">
        <Grid>
          <Grid.Col span={{ base: 12, md: 5 }}>
            <Center>
              <DeckOverview deckInfo={deckInfo} greenRevealed={greenRevealed} />
            </Center>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 7 }}>
            <Stack gap="sm">
              {playerInfo.map((player) => (
                <PlayerOverview
                  key={player.email}
                  player={player}
                  activePlayer={activePlayer}
                  highestBidTotal={highestBidTotal}
                />
              ))}
            </Stack>
          </Grid.Col>
        </Grid>
      </Container>
      {loggedInPlayer && <div className={panelClasses.pageSpacer} />}
      {loggedInPlayer && deckInfo && (
        <BidPanel
          cards={bidding.moneyCards}
          staged={bidding.staged}
          isActive={isActive}
          activePlayer={activePlayer}
          currentCard={deckInfo.currentStatusCard}
          highestBidTotal={highestBidTotal}
          currentTotal={bidding.currentTotal}
          proposedTotal={bidding.proposedTotal}
          moneyTotal={bidding.moneyTotal}
          canBid={bidding.canBid}
          loading={bidding.loading}
          onToggle={bidding.toggleCard}
          onBid={bidding.submitBid}
          onPass={bidding.pass}
        />
      )}
    </>
  );
}
