import { Box, Flex } from "@mantine/core";
import { GameState, PlayerState } from "../types";
import PlayerGameState from "./PlayerGameState";
import PlayerRoundState from "./PlayerRoundState";
import { useMemo } from "react";
import { User } from "firebase/auth";

export default function PlayerOverview({
  player,
  activePlayer,
  lobbyId,
  user,
  highestBidTotal,
}: {
  player: PlayerState;
  activePlayer: GameState["activePlayer"];
  lobbyId: string;
  user: User;
  highestBidTotal: number;
}) {
  const isActivePlayer = useMemo(() => {
    return player.email === activePlayer;
  }, [player, activePlayer]);

  const isLoggedInUserActivePlayer = useMemo(() => {
    return user.email === activePlayer && isActivePlayer;
  }, [user.email, activePlayer, isActivePlayer]);

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
        <PlayerGameState player={player} loggedInUser={user.email || ""} />
      </Box>

      <Box w={"50%"}>
        <PlayerRoundState
          player={player}
          lobbyId={lobbyId}
          isLoggedInUserActivePlayer={isLoggedInUserActivePlayer}
          highestBidTotal={highestBidTotal}
        />
      </Box>
    </Flex>
  );
}
