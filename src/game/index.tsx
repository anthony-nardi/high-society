import { Box, Center, Container, Grid, Loader } from "@mantine/core";
import { User } from "firebase/auth";
import { getDatabase, onValue, ref } from "firebase/database";
import { useEffect, useMemo, useRef, useState } from "react";
import DeckOverview from "./components/DeckOverview";
import PlayerOverview from "./components/PlayerOverview";
import { GameState } from "./types";
import { notifications } from "@mantine/notifications";
import GameOver from "./components/GameOver";
import { useLobbyContext } from "../context/LobbyProvider";
import useGameState from "./hooks/useGameState";

export default function Game() {
  const { user, lobbyId, isSignedIn } = useLobbyContext();

  const { gameState: gameData } = useGameState(lobbyId, !!isSignedIn);

  // const listeningToLobby = useRef<string | null>(null);
  // const previousNotificationTimestamp = useRef<number>(0);

  // useEffect(() => {
  //   if (listeningToLobby.current === lobbyId) {
  //     return;
  //   }

  //   listeningToLobby.current = lobbyId;

  //   const db = getDatabase();

  //   const lobbyRef = ref(db, "games/" + lobbyId + "/public");

  //   onValue(lobbyRef, (snapshot) => {
  //     const data = snapshot.val();
  //     setGameData(() => {
  //       const currentNotificationTimestamp =
  //         (data && data.notification && data.notification.timestamp) || 0;

  //       if (
  //         previousNotificationTimestamp.current !== currentNotificationTimestamp
  //       ) {
  //         previousNotificationTimestamp.current = data.notification.timestamp;

  //         notifications.show({
  //           title: data.notification?.title as string,
  //           message: (data.notification?.message || "") as string,
  //           autoClose: 6000,
  //           withBorder: true,
  //           style: { backgroundColor: "#42384B" },
  //           color: "#fff",
  //         });
  //       }
  //       return data;
  //     });
  //   });
  // }, [lobbyId]);

  const deckInfo = useMemo(() => {
    if (!gameData) {
      return null;
    }

    return {
      currentStatusCard: gameData.currentStatusCard,
      remainingCards: gameData.remainingCards,
    };
  }, [gameData]);

  const playerInfo = useMemo(() => {
    if (!gameData) {
      return [];
    }

    return gameData.players;
  }, [gameData]);

  const activePlayer = useMemo(() => {
    if (!gameData) {
      return "";
    }

    return gameData.activePlayer;
  }, [gameData]);

  const highestBidTotal = useMemo(() => {
    if (!gameData || !gameData.players) {
      return 0;
    }

    let highestBid = 0;

    gameData.players.forEach((player) => {
      const totalAmountBid = (player.currentBid || []).reduce((sum, curr) => {
        return Number(sum) + Number(curr);
      }, 0);
      if (totalAmountBid > highestBid) {
        highestBid = totalAmountBid;
      }
    });

    return highestBid;
  }, [gameData]);

  const isInLobby = useMemo(() => {
    return isSignedIn && !gameData;
  }, [gameData, isSignedIn]);

  const isGameActive = useMemo(() => {
    return isSignedIn && gameData && gameData.status && lobbyId && user;
  }, [gameData, isSignedIn, lobbyId, user]);

  const isGameOver = useMemo(() => {
    return isGameActive && gameData?.status === "GAME_OVER";
  }, [gameData?.status, isGameActive]);

  const isGameInProgress = useMemo(() => {
    return isGameActive && gameData?.status === "IN_PROGRESS";
  }, [gameData?.status, isGameActive]);

  if (!isGameInProgress) {
    return null;
  }

  if (!isInLobby && gameData === null) {
    return (
      <Center>
        <Loader />
      </Center>
    );
  }

  if (isGameOver) {
    return <GameOver lobbyId={lobbyId?.toString() as string} />;
  }

  if (!gameData) {
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
