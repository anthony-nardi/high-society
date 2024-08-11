import { useMemo } from "react";
import { NoThanksGameState, NoThanksPlayerState } from "../types";
import { Box, Center, Flex } from "@mantine/core";
import CardFront from "../../card/CardFront";

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

  const playersToPointsMap = useMemo(() => {
    if (!gameState) return null;
    return gameState.players.reduce(
      (acc: { [key: string]: number }, player) => {
        let points = 0;
        const sortedCards = (player.cards || []).sort((a, b) => a - b);
        for (let i = 0; i < sortedCards.length; i++) {
          const card = sortedCards[i];
          if (sortedCards[i - 1] !== card - 1) {
            points += card;
          }
        }
        points -= player.chips;
        acc[player.email] = points;
        return acc;
      },
      {}
    );
  }, [gameState]);

  const lowestScore = useMemo(() => {
    if (!playersToPointsMap) return null;
    return Object.values(playersToPointsMap).reduce((lowest, points) => {
      return points < lowest ? points : lowest;
    }, Infinity);
  }, [playersToPointsMap]);

  const renderedPlayersEndGame = useMemo(() => {
    if (!playersToPointsMap || !playersAsMap) return null;
    return Object.entries(playersToPointsMap).map(([email, points]) => {
      const player = playersAsMap[email];
      const isWinner = points === lowestScore;
      return (
        <Box
          key={email}
          p="xs"
          className={isWinner ? "animated-border-box" : ""}
        >
          <div>
            <Box>
              <b>{isWinner ? `${email} has won!` : email}</b>
              <Flex wrap="wrap">
                {(player.cards || []).map((card) => (
                  <CardFront key={card} card={card} size="sm" />
                ))}
              </Flex>
              <div>Chips: {player.chips}</div>
              <b>Final score: {points}</b>
            </Box>
          </div>
        </Box>
      );
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
