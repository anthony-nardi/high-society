import { Box, Flex } from "@mantine/core";
import { GameState, PlayerState } from "../types";
import PlayerGameState from "./PlayerGameState";
import PlayerRoundState from "./PlayerRountState";
import { useMemo } from "react";

export default function PlayerOverview({
  player,
  activePlayer,
}: {
  player: PlayerState;
  activePlayer: GameState["activePlayer"];
}) {
  const isActivePlayer = useMemo(() => {
    return player.email === activePlayer;
  }, [player, activePlayer]);

  return (
    <Flex justify="space-between">
      <Box>
        <PlayerGameState player={player} />
      </Box>

      <Box w={"50%"}>
        <PlayerRoundState isActivePlayer={isActivePlayer} player={player} />
      </Box>
    </Flex>
  );
}
