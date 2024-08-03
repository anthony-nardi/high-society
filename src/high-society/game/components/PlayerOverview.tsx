import { Box, Flex } from "@mantine/core";
import { GameState, PlayerState } from "../types";
import PlayerGameState from "./PlayerGameState";
import PlayerRoundState from "./PlayerRoundState";
import { useMemo } from "react";
import { useUserContext } from "../../context/useUserContext";

export default function PlayerOverview({
  player,
  activePlayer,
  highestBidTotal,
}: {
  player: PlayerState;
  activePlayer: GameState["activePlayer"];
  highestBidTotal: number;
}) {
  const { user } = useUserContext();

  const isActivePlayer = useMemo(() => {
    return player.email === activePlayer;
  }, [player, activePlayer]);

  const isLoggedInUserActivePlayer = useMemo(() => {
    return user && user.email === activePlayer && isActivePlayer;
  }, [user, activePlayer, isActivePlayer]);

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
        <PlayerGameState
          player={player}
          loggedInUser={(user && user.email) || ""}
        />
      </Box>

      <Box w={"50%"}>
        <PlayerRoundState
          player={player}
          isLoggedInUserActivePlayer={!!isLoggedInUserActivePlayer}
          highestBidTotal={highestBidTotal}
        />
      </Box>
    </Flex>
  );
}
