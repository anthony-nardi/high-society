import { useEffect, useMemo, useState } from "react";
import { GameState } from "../types";
import { getDatabase, onValue, ref } from "firebase/database";
import { Box, Center, Flex } from "@mantine/core";

type MapOfPlayersToMetadata = {
  [key: string]: {
    finalScore: number;
    moneyCards: string[];
    statusCards: string[];
    email: string;
  };
};

export default function GameOver({ lobbyId }: { lobbyId: string }) {
  const [gameData, setGameData] = useState<null | GameState>(null);
  useEffect(() => {
    const db = getDatabase();

    const lobbyRef = ref(db, "games/" + lobbyId + "/public");

    onValue(lobbyRef, (snapshot) => {
      const data = snapshot.val();
      setGameData(data);
    });
  }, [lobbyId]);

  const mapOfPlayersToMetadata: null | MapOfPlayersToMetadata = useMemo(() => {
    if (!gameData) return null;

    const metadata: MapOfPlayersToMetadata = {};

    for (const player of gameData.players) {
      player.statusCards = player.statusCards || [];

      let multiplier = 1;
      let score = 0;

      for (const card of player.statusCards) {
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
        moneyCards: player.moneyCards,
        statusCards: player.statusCards,
        email: player.email,
      };
    }

    return metadata;
  }, [gameData]);

  const tiedPlayers = useMemo(() => {
    if (!mapOfPlayersToMetadata) return [];

    let highScore;
    let playersWithHighScore: string[] = [];

    for (const metadata in mapOfPlayersToMetadata) {
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

    return playersWithHighScore;
  }, [mapOfPlayersToMetadata]);

  const renderedWinner = useMemo(() => {
    const renderedPlayersEndGame = [];

    if (mapOfPlayersToMetadata && tiedPlayers.length === 1) {
      for (const playerEmail in mapOfPlayersToMetadata) {
        const isWinner = tiedPlayers[0] === playerEmail;
        const player = mapOfPlayersToMetadata[playerEmail];
        if (isWinner) {
          renderedPlayersEndGame.push(
            <Box mt="md">
              <b>{player.email} has won!</b>
              <div>Cards in hand: {(player.moneyCards || []).join(", ")}</div>
              <div>Status cards: {(player.statusCards || []).join(", ")}</div>
              <b>Final score: {player.finalScore}</b>
            </Box>
          );
        } else {
          renderedPlayersEndGame.push(
            <Box mt="md">
              <b>{player.email}</b>
              <div>Cards in hand: {(player.moneyCards || []).join(", ")}</div>
              <div>Status cards: {(player.statusCards || []).join(", ")}</div>
              <b>Final score: {player.finalScore}</b>
            </Box>
          );
        }
      }
    } else {
      for (const playerEmail in mapOfPlayersToMetadata) {
        const isWinner = tiedPlayers[0] === playerEmail;
        const player = mapOfPlayersToMetadata[playerEmail];
        if (isWinner) {
          renderedPlayersEndGame.push(
            <>
              <b>
                {player.email} has tied! Whoerver has the most money leftover
                wins... (todo... figure this out)
              </b>
              <div>Cards in hand: {(player.moneyCards || []).join(", ")}</div>
              <div>Status cards: {(player.statusCards || []).join(", ")}</div>
              <b>Final score: {player.finalScore}</b>
            </>
          );
        } else {
          renderedPlayersEndGame.push(
            <>
              <b>{player.email}</b>
              <div>Cards in hand: {(player.moneyCards || []).join(", ")}</div>
              <div>Status cards: {(player.statusCards || []).join(", ")}</div>
              <b>Final score: {player.finalScore}</b>
            </>
          );
        }
      }
    }
    return renderedPlayersEndGame;
  }, [mapOfPlayersToMetadata, tiedPlayers]);

  return (
    <Center>
      <Flex direction="column">
        <h1>Game Over</h1>
        {renderedWinner}
      </Flex>
    </Center>
  );
}
