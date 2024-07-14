import { Box, Center, Container, Grid, rem } from "@mantine/core";
import { User } from "firebase/auth";
import { getDatabase, onValue, ref } from "firebase/database";
import { useEffect, useMemo, useState } from "react";
import DeckOverview from "./components/DeckOverview";
import PlayerOverview from "./components/PlayerOverview";
import { GameState } from "./types";

const PRIMARY_COL_HEIGHT = rem(250);

export default function Game({
  lobbyId,
  user,
}: {
  lobbyId: string;
  user: User;
}) {
  const [gameData, setGameData] = useState<null | GameState>(null);
  useEffect(() => {
    const db = getDatabase();

    const lobbyRef = ref(db, "games/" + lobbyId + "/public");

    onValue(lobbyRef, (snapshot) => {
      const data = snapshot.val();
      console.log("New game state!", data);
      setGameData(data);
    });
  }, [lobbyId]);

  const SECONDARY_COL_HEIGHT = `calc(${PRIMARY_COL_HEIGHT} / 2 - var(--mantine-spacing-md) / 2)`;

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
    return <>loading...</>;
  }

  return (
    <>
      <Container fluid my="md">
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
                    <Box
                      style={{
                        height: SECONDARY_COL_HEIGHT,
                      }}
                    >
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
