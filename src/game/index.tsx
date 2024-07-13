import {
  Box,
  Code,
  Container,
  Grid,
  rem,
  SimpleGrid,
  Skeleton,
} from "@mantine/core";
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
  console.log(user);
  const [gameData, setGameData] = useState<null | GameState>(null);
  console.log(gameData);
  useEffect(() => {
    const db = getDatabase();

    const lobbyRef = ref(db, "games/" + lobbyId + "/public");

    onValue(lobbyRef, (snapshot) => {
      const data = snapshot.val();
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

  if (!gameData) {
    return <>loading...</>;
  }

  return (
    <>
      <Container fluid my="md">
        <SimpleGrid cols={{ base: 2, sm: 2 }} spacing="md">
          <Box
            style={{
              border: "1px solid red",
              height: Number(PRIMARY_COL_HEIGHT) * 2,
            }}
          >
            <DeckOverview deckInfo={deckInfo} />
          </Box>
          <Grid gutter="md">
            {playerInfo.map((player) => {
              return (
                <Grid.Col
                  style={{ border: "1px solid red" }}
                  span={12}
                  key={player.email}
                >
                  <Box
                    style={{
                      height: SECONDARY_COL_HEIGHT,
                    }}
                  >
                    <PlayerOverview
                      player={player}
                      activePlayer={activePlayer}
                    />
                  </Box>
                </Grid.Col>
              );
            })}
          </Grid>
        </SimpleGrid>
      </Container>
    </>
  );
}
