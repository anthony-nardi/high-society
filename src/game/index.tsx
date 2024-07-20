import { Box, Center, Container, Grid } from "@mantine/core";
import { User } from "firebase/auth";
import { getDatabase, onValue, ref } from "firebase/database";
import { useEffect, useMemo, useRef, useState } from "react";
import DeckOverview from "./components/DeckOverview";
import PlayerOverview from "./components/PlayerOverview";
import { GameState } from "./types";
import { notifications } from "@mantine/notifications";

export default function Game({
  lobbyId,
  user,
}: {
  lobbyId: string;
  user: User;
}) {
  const [gameData, setGameData] = useState<null | GameState>(null);
  const listeningToLobby = useRef<string | null>(null);
  useEffect(() => {
    if (listeningToLobby.current === lobbyId) {
      return;
    }

    listeningToLobby.current = lobbyId;

    const db = getDatabase();

    const lobbyRef = ref(db, "games/" + lobbyId + "/public");

    onValue(lobbyRef, (snapshot) => {
      const data = snapshot.val();
      console.log("New game state!", data);
      setGameData((prevGameData) => {
        const previousNotificationTimestamp =
          (prevGameData &&
            prevGameData.notification &&
            prevGameData.notification.timestamp) ||
          0;
        const currentNotificationTimestamp =
          (data && data.notification && data.notification.timestamp) || 0;

        const shouldRenderNotification =
          previousNotificationTimestamp !== currentNotificationTimestamp;

        if (shouldRenderNotification) {
          console.log(`lets render notification : ${data.notification?.title}`);

          notifications.show({
            title: data.notification?.title as string,
            message: " ",
            autoClose: 6000,
            withBorder: true,
            style: { backgroundColor: "#42384B" },
            color: "#fff",
          });
        }
        return data;
      });
    });
  }, [lobbyId]);

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
                        lobbyId={lobbyId}
                        user={user}
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
