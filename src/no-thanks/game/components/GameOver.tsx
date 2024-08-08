import { useMemo } from "react";
import { NoThanksGameState, NoThanksPlayerState } from "../types";
import { Box, Center, Flex } from "@mantine/core";

export default function GameOver({
  gameState,
}: {
  gameState: NoThanksGameState | null;
}) {
  const playersAsMap = useMemo(() => {
    if (!gameState) return null;

    return gameState.players.reduce(
      (acc: { [key: string]: NoThanksPlayerState }, player) => {
        acc[player.email] = player;
        return acc;
      },
      {}
    );
  }, [gameState]);

  // Each card is worth its face value
  // Each chip is worth -1 point
  // Each consecutive card is worth the face value of the lowest card in the run
  const playersToPointsMap = gameState?.players.reduce(
    (acc: { [key: string]: number }, player) => {
      let points = 0;

      player.cards = player.cards || [];

      // Calculate points for cards
      const sortedCards = player.cards.sort((a, b) => a - b);

      for (let i = 0; i < sortedCards.length; i++) {
        const card = sortedCards[i];

        if (sortedCards[i - 1] === card - 1) {
          continue;
        } else {
          points += card;
        }
      }

      // Subtract points for chips
      points -= player.chips;

      acc[player.email] = points;
      return acc;
    },
    {}
  );

  const lowestScore = useMemo(() => {
    if (!playersToPointsMap) return null;

    return Object.values(playersToPointsMap).reduce((lowest, points) => {
      return points < lowest ? points : lowest;
    }, Infinity);
  }, [playersToPointsMap]);

  const renderedPlayersEndGame = useMemo(() => {
    if (!playersToPointsMap || !playersAsMap) return null;

    return Object.entries(playersToPointsMap).map(([email, points]) => {
      if (points === lowestScore) {
        return (
          <Box key={email}>
            <div className="animated-border-box">
              <Box p="xs">
                <b>{email} has won!</b>
                <div>Cards: {(playersAsMap[email].cards || []).join(", ")}</div>
                <b>Final score: {points}</b>
              </Box>
            </div>
          </Box>
        );
      } else {
        return (
          <Box p="xs" key={email}>
            <b>{email}</b>
            <div>Cards: {(playersAsMap[email].cards || []).join(", ")}</div>
            <b>Final score: {points}</b>
          </Box>
        );
      }
    });
  }, [playersToPointsMap, lowestScore, playersAsMap]);

  return (
    <Center>
      <Flex direction="column">
        <h1 style={{ padding: "8px" }}>Game Over</h1>
        {renderedPlayersEndGame}
      </Flex>
    </Center>
  );
}
