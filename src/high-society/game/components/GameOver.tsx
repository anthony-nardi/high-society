import { useEffect, useMemo, useState } from "react";
import { HighSocietyGameState } from "../types";
import { getDatabase, onValue, ref } from "firebase/database";
import { Box, Center, Flex } from "@mantine/core";

type PlayerMetadata = {
  finalScore: number;
  moneyCards: string[];
  statusCards: string[];
  email: string;
  moneyLeft: number;
};

type MapOfPlayersToMetadata = {
  [key: string]: PlayerMetadata;
};

export default function GameOver({ lobbyId }: { lobbyId: string }) {
  const [gameData, setGameData] = useState<null | HighSocietyGameState>(null);
  useEffect(() => {
    const db = getDatabase();

    const lobbyRef = ref(db, "games/" + lobbyId + "/public");

    const unsubscribe = onValue(lobbyRef, (snapshot) => {
      const data = snapshot.val() as HighSocietyGameState;
      setGameData(data);
    });

    return () => unsubscribe();
  }, [lobbyId]);

  const mapOfPlayersToMetadata: null | MapOfPlayersToMetadata = useMemo(() => {
    if (!gameData) return null;

    const metadata: MapOfPlayersToMetadata = {};

    for (const player of gameData.players) {
      const statusCards = player.statusCards || [];
      const moneyCards = player.moneyCards || [];

      let multiplier = 1;
      let score = 0;

      for (const card of statusCards) {
        if (card === "1/2") {
          multiplier = multiplier * 0.5;
        } else if (card === "2x") {
          multiplier = multiplier * 2;
        } else {
          score = score + Number(card);
        }
      }

      metadata[player.email] = {
        finalScore: score * multiplier,
        moneyLeft: moneyCards.reduce(
          (total, card) => Number(total) + Number(card),
          0
        ),
        moneyCards,
        statusCards,
        email: player.email,
      };
    }

    return metadata;
  }, [gameData]);

  const playersWithLeastMoneyRemaining = useMemo(() => {
    let moneyLeft = 1000;
    let playersWithLowestTotal: string[] = [];

    if (!mapOfPlayersToMetadata) {
      return [];
    }

    for (const metadata in mapOfPlayersToMetadata) {
      if (mapOfPlayersToMetadata[metadata].moneyLeft === moneyLeft) {
        moneyLeft = mapOfPlayersToMetadata[metadata].moneyLeft;

        playersWithLowestTotal.push(mapOfPlayersToMetadata[metadata].email);
      } else if (mapOfPlayersToMetadata[metadata].moneyLeft < moneyLeft) {
        moneyLeft = mapOfPlayersToMetadata[metadata].moneyLeft;
        playersWithLowestTotal = [mapOfPlayersToMetadata[metadata].email];
      }
    }

    return playersWithLowestTotal;
  }, [mapOfPlayersToMetadata]);

  const winningPlayers = useMemo(() => {
    if (!mapOfPlayersToMetadata) return [];

    let highScore: number | undefined;
    let playersWithHighScore: string[] = [];

    for (const metadata in mapOfPlayersToMetadata) {
      if (
        playersWithLeastMoneyRemaining.includes(
          mapOfPlayersToMetadata[metadata].email
        )
      ) {
        continue;
      }

      if (
        !highScore ||
        mapOfPlayersToMetadata[metadata].finalScore > highScore
      ) {
        highScore = mapOfPlayersToMetadata[metadata].finalScore;
        playersWithHighScore = [mapOfPlayersToMetadata[metadata].email];
      } else if (mapOfPlayersToMetadata[metadata].finalScore === highScore) {
        playersWithHighScore.push(mapOfPlayersToMetadata[metadata].email);
      }
    }

    if (playersWithHighScore.length === 1) {
      return playersWithHighScore;
    }

    // Tied on score: the player with the most money left wins.
    if (playersWithHighScore.length > 1) {
      const mostMoneyLeft = Math.max(
        ...playersWithHighScore.map(
          (email) => mapOfPlayersToMetadata[email].moneyLeft
        )
      );
      playersWithHighScore = playersWithHighScore.filter(
        (email) => mapOfPlayersToMetadata[email].moneyLeft === mostMoneyLeft
      );
    }

    if (playersWithHighScore.length === 1) {
      return playersWithHighScore;
    }

    // Still tied: the player holding the highest luxury card wins.
    for (let card = 10; card >= 1 && playersWithHighScore.length > 1; card--) {
      const holders = playersWithHighScore.filter((email) =>
        mapOfPlayersToMetadata[email].statusCards.includes(`${card}`)
      );
      if (holders.length > 0) {
        playersWithHighScore = holders;
      }
    }

    return playersWithHighScore;
  }, [mapOfPlayersToMetadata, playersWithLeastMoneyRemaining]);

  const renderedWinner = useMemo(() => {
    const renderedPlayersEndGame = [];

    if (mapOfPlayersToMetadata && winningPlayers.length === 1) {
      for (const playerEmail in mapOfPlayersToMetadata) {
        const isWinner = winningPlayers[0] === playerEmail;
        const player = mapOfPlayersToMetadata[playerEmail];
        if (isWinner) {
          renderedPlayersEndGame.push(
            <Box key={player.email}>
              <div className="animated-border-box">
                <Box p="xs">
                  <b>{player.email} has won!</b>
                  <div>Money left: ${player.moneyLeft}</div>
                  <div>
                    Cards in hand: {(player.moneyCards || []).join(", ")}
                  </div>
                  <div>
                    Status cards: {(player.statusCards || []).join(", ")}
                  </div>
                  <b>Final score: {player.finalScore}</b>
                </Box>
              </div>
            </Box>
          );
        } else {
          renderedPlayersEndGame.push(
            <Box p="xs" key={player.email}>
              <b>{player.email}</b>
              <div>Money left: ${player.moneyLeft}</div>
              <div>Cards in hand: {(player.moneyCards || []).join(", ")}</div>
              <div>Status cards: {(player.statusCards || []).join(", ")}</div>
              <b>Final score: {player.finalScore}</b>
            </Box>
          );
        }
      }
    } else {
      for (const playerEmail in mapOfPlayersToMetadata) {
        const player = mapOfPlayersToMetadata[playerEmail];
        renderedPlayersEndGame.push(
          <Box p="xs" key={player.email}>
            <b>{player.email}</b>
            <div>Money left: ${player.moneyLeft}</div>
            <div>Cards in hand: {(player.moneyCards || []).join(", ")}</div>
            <div>Status cards: {(player.statusCards || []).join(", ")}</div>
            <b>Final score: {player.finalScore}</b>
          </Box>
        );
      }
    }
    return renderedPlayersEndGame;
  }, [mapOfPlayersToMetadata, winningPlayers]);

  return (
    <Center>
      <Flex direction="column">
        <h1 style={{ padding: "8px" }}>Game Over</h1>
        {renderedWinner}
      </Flex>
    </Center>
  );
}
