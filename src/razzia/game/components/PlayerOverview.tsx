import { useMemo } from "react";
import { RazziaGameState, RazziaPlayerState } from "../types";
import { Box, Flex } from "@mantine/core";
import PlayerGameState from "./PlayerGameState";

export default function PlayerOverview({
  player,
  activePlayer,
}: {
  player: RazziaPlayerState;
  activePlayer: RazziaGameState["activePlayer"];
}) {
  const isActivePlayer = useMemo(() => {
    return player.email === activePlayer;
  }, [player, activePlayer]);

  const styles = useMemo(() => {
    if (isActivePlayer) {
      return {
        root: {
          border: "2px solid #dadada",
          borderRadius: "12px",
          boxShadow: "0 0 8px #9ecaed",
        },
      };
    }
  }, [isActivePlayer]);

  return (
    <Flex p="md" justify="space-between" styles={styles} key={player.email}>
      <Box>
        <PlayerGameState player={player} activePlayer={activePlayer} />
      </Box>
    </Flex>
  );
}
