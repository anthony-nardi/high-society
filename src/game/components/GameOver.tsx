import { useEffect, useMemo, useState } from "react";
import { GameState } from "../types";
import { getDatabase, onValue, ref } from "firebase/database";

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
    if (mapOfPlayersToMetadata) {
      const winner = mapOfPlayersToMetadata[tiedPlayers[0]];
      return (
        <>
          <b>{winner.email} has won!</b>
          <div>Cards in hand: ${(winner.moneyCards || []).join(", ")}</div>
          <div>Status cards: ${(winner.statusCards || []).join(", ")}</div>
          <b>Final score: ${winner.finalScore}</b>
        </>
      );
    }
  }, [mapOfPlayersToMetadata, tiedPlayers]);

  return <>{renderedWinner}</>;
}
